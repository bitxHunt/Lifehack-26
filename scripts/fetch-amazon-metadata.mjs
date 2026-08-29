import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  statfs,
  writeFile,
} from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createInterface } from "node:readline";
import { createGunzip, createGzip } from "node:zlib";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const catalogPath = join(projectRoot, "data", "amazon-reviews-2023-catalog.json");

function usage() {
  return `Amazon Reviews 2023 product metadata extractor

Usage:
  npm run data:products -- --list
  npm run data:products -- --category <name> [--category <name> ...]
  npm run data:products -- --all

Options:
  --list                 List categories and source sizes
  --category <name>      Fetch a category (repeatable; comma-separated is accepted)
  --all                  Fetch all 34 metadata categories
  --output-dir <path>    Output directory (default: data/products)
  --limit <rows>         Produce a clearly named partial sample for validation
  --keep-source          Keep downloaded source gzip files after transformation
  --force                Rebuild outputs that already exist
  --help                 Show this help
`;
}

function parseArguments(argv) {
  const options = {
    all: false,
    categories: [],
    force: false,
    help: false,
    keepSource: false,
    limit: null,
    list: false,
    outputDir: join(projectRoot, "data", "products"),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--all") options.all = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--keep-source") options.keepSource = true;
    else if (argument === "--list") options.list = true;
    else if (argument === "--category") {
      const value = argv[++index];
      if (!value) throw new Error("--category requires a category name");
      options.categories.push(...value.split(",").map((name) => name.trim()).filter(Boolean));
    } else if (argument === "--limit") {
      const value = Number.parseInt(argv[++index], 10);
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error("--limit must be a positive integer");
      }
      options.limit = value;
    } else if (argument === "--output-dir") {
      const value = argv[++index];
      if (!value) throw new Error("--output-dir requires a path");
      options.outputDir = isAbsolute(value) ? value : resolve(projectRoot, value);
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return options;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "unknown";
  const units = ["B", "KiB", "MiB", "GiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function serializeJsonLine(value) {
  // U+2028 and U+2029 are valid inside JSON strings, but many line-oriented
  // readers treat them as record separators. Escaping them keeps JSONL to one
  // physical line per product across runtimes.
  return `${JSON.stringify(value)
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")}\n`;
}

async function pathSize(path) {
  try {
    return (await stat(path)).size;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function availableBytes(path) {
  const fileSystem = await statfs(path, { bigint: true });
  return Number(fileSystem.bavail * fileSystem.bsize);
}

async function assertEnoughDiskSpace({ cacheDirectory, outputDirectory, categories }) {
  if (categories.length === 0) return;

  // The transformed gzip is close to the source gzip size. The margin accounts
  // for the two added fields and compression differences.
  const estimatedOutputBytes = Math.ceil(
    categories.reduce((total, category) => total + category.compressedBytes, 0) * 1.15,
  );
  const estimatedCacheBytes = Math.max(
    ...categories.map((category) => category.compressedBytes),
  );
  const outputRoot = parse(resolve(outputDirectory)).root.toLowerCase();
  const cacheRoot = parse(resolve(cacheDirectory)).root.toLowerCase();

  if (outputRoot === cacheRoot) {
    const freeBytes = await availableBytes(outputDirectory);
    const requiredBytes = estimatedOutputBytes + estimatedCacheBytes;
    if (freeBytes < requiredBytes) {
      throw new Error(
        `Not enough free space on ${outputRoot}: about ${formatBytes(requiredBytes)} is required ` +
          `for the selected outputs and largest temporary source, but ${formatBytes(freeBytes)} is available. ` +
          "Select fewer categories or use --output-dir on a larger drive.",
      );
    }
    return;
  }

  const outputFreeBytes = await availableBytes(outputDirectory);
  if (outputFreeBytes < estimatedOutputBytes) {
    throw new Error(
      `Not enough free space for outputs on ${outputRoot}: about ${formatBytes(estimatedOutputBytes)} ` +
        `is required, but ${formatBytes(outputFreeBytes)} is available.`,
    );
  }

  const cacheFreeBytes = await availableBytes(cacheDirectory);
  if (cacheFreeBytes < estimatedCacheBytes) {
    throw new Error(
      `Not enough free space for the temporary source on ${cacheRoot}: about ${formatBytes(estimatedCacheBytes)} ` +
        `is required, but ${formatBytes(cacheFreeBytes)} is available.`,
    );
  }
}

async function downloadSource({ category, sourceUrl, cacheDirectory, expectedBytes }) {
  await mkdir(cacheDirectory, { recursive: true });

  const sourcePath = join(cacheDirectory, `meta_${category}.source.jsonl.gz`);
  const partialPath = `${sourcePath}.part`;
  const head = await fetch(sourceUrl, { method: "HEAD" });
  if (!head.ok) throw new Error(`HEAD ${sourceUrl} failed with HTTP ${head.status}`);

  const remoteBytes = Number.parseInt(head.headers.get("content-length") ?? "", 10);
  if (!Number.isSafeInteger(remoteBytes) || remoteBytes <= 0) {
    throw new Error(`Source did not provide a valid Content-Length: ${sourceUrl}`);
  }
  if (expectedBytes && expectedBytes !== remoteBytes) {
    console.warn(
      `  Source size changed from ${formatBytes(expectedBytes)} to ${formatBytes(remoteBytes)}; using the live size.`,
    );
  }

  const completedBytes = await pathSize(sourcePath);
  if (completedBytes === remoteBytes) return sourcePath;
  if (completedBytes !== null) await rm(sourcePath);

  let downloadedBytes = (await pathSize(partialPath)) ?? 0;
  if (downloadedBytes > remoteBytes) {
    await rm(partialPath);
    downloadedBytes = 0;
  }
  if (downloadedBytes === remoteBytes) {
    await rename(partialPath, sourcePath);
    return sourcePath;
  }

  const headers = downloadedBytes > 0 ? { Range: `bytes=${downloadedBytes}-` } : {};
  let response = await fetch(sourceUrl, { headers });

  if (downloadedBytes > 0 && response.status !== 206) {
    console.warn("  Server did not accept the resume request; restarting this category.");
    await rm(partialPath, { force: true });
    downloadedBytes = 0;
    response = await fetch(sourceUrl);
  }

  if (!response.ok || !response.body) {
    throw new Error(`GET ${sourceUrl} failed with HTTP ${response.status}`);
  }

  console.log(
    `  Downloading ${formatBytes(remoteBytes)}${downloadedBytes ? ` (resuming at ${formatBytes(downloadedBytes)})` : ""}...`,
  );
  const destination = createWriteStream(partialPath, {
    flags: downloadedBytes > 0 ? "a" : "w",
  });
  await pipeline(Readable.fromWeb(response.body), destination);

  const finalBytes = await pathSize(partialPath);
  if (finalBytes !== remoteBytes) {
    throw new Error(
      `Incomplete download for ${category}: expected ${remoteBytes} bytes, received ${finalBytes}`,
    );
  }

  await rename(partialPath, sourcePath);
  return sourcePath;
}

async function sha256(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function transformCategory({ category, sourcePath, outputPath, limit, force }) {
  if (!force && (await pathSize(outputPath)) !== null) {
    console.log(`  Skipping existing output: ${outputPath}`);
    return null;
  }

  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  await rm(temporaryPath, { force: true });

  const compressedSource = createReadStream(sourcePath);
  const source = compressedSource.pipe(createGunzip());
  const lines = createInterface({ input: source, crlfDelay: Infinity });
  const gzip = createGzip({ level: 9 });
  const destination = createWriteStream(temporaryPath, { flags: "wx" });
  const outputDone = pipeline(gzip, destination);

  let lineNumber = 0;
  let productCount = 0;
  let missingProductUrlCount = 0;
  let stoppedEarly = false;

  try {
    for await (const line of lines) {
      lineNumber += 1;
      if (!line.trim()) continue;

      let sourceProduct;
      try {
        sourceProduct = JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSON in ${category} at line ${lineNumber}: ${error.message}`);
      }

      const parentAsin =
        typeof sourceProduct.parent_asin === "string"
          ? sourceProduct.parent_asin.trim()
          : "";
      const amazonProductUrl = parentAsin
        ? `https://www.amazon.com/dp/${encodeURIComponent(parentAsin)}`
        : null;
      if (!amazonProductUrl) missingProductUrlCount += 1;

      const product = {
        ...sourceProduct,
        source_category: category,
        amazon_product_url: amazonProductUrl,
      };

      if (!gzip.write(serializeJsonLine(product))) {
        await new Promise((resolveDrain) => gzip.once("drain", resolveDrain));
      }
      productCount += 1;

      if (productCount % 100000 === 0) {
        console.log(`  Processed ${productCount.toLocaleString()} products...`);
      }
      if (limit !== null && productCount >= limit) {
        stoppedEarly = true;
        break;
      }
    }

    if (stoppedEarly) {
      lines.close();
      source.destroy();
      compressedSource.destroy();
    }

    gzip.end();
    await outputDone;
  } catch (error) {
    lines.close();
    source.destroy();
    compressedSource.destroy();
    gzip.destroy();
    await outputDone.catch(() => {});
    await rm(temporaryPath, { force: true });
    throw error;
  }

  if (force) await rm(outputPath, { force: true });
  await rename(temporaryPath, outputPath);

  const outputBytes = await pathSize(outputPath);
  return {
    category,
    complete: limit === null,
    generatedAt: new Date().toISOString(),
    missingProductUrlCount,
    outputBytes,
    outputFile: outputPath,
    productCount,
    sha256: await sha256(outputPath),
  };
}

async function updateManifest(outputDirectory, entry) {
  const manifestPath = join(outputDirectory, "manifest.json");
  let manifest = { dataset: "McAuley-Lab/Amazon-Reviews-2023", outputs: {} };

  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const key = entry.complete ? entry.category : `${entry.category}:sample-${entry.productCount}`;
  manifest.outputs[key] = {
    ...entry,
    outputFile: entry.outputFile.replace(`${outputDirectory}\\`, "").replace(`${outputDirectory}/`, ""),
  };

  const temporaryPath = `${manifestPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await rm(manifestPath, { force: true });
  await rename(temporaryPath, manifestPath);
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }

  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  const categoryByName = new Map(catalog.categories.map((category) => [category.name, category]));

  if (options.list) {
    console.table(
      catalog.categories.map((category) => ({
        Category: category.name,
        Compressed: formatBytes(category.compressedBytes),
        Uncompressed: formatBytes(category.uncompressedBytes),
      })),
    );
    console.log(
      `Total: ${formatBytes(catalog.totals.compressedBytes)} compressed, ${formatBytes(catalog.totals.uncompressedBytes)} uncompressed`,
    );
    return;
  }

  const selectedNames = options.all
    ? catalog.categories.map((category) => category.name)
    : [...new Set(options.categories)];

  if (selectedNames.length === 0) {
    throw new Error("Choose --category <name> or --all. Use --list to inspect categories.");
  }

  const unknownNames = selectedNames.filter((name) => !categoryByName.has(name));
  if (unknownNames.length > 0) {
    throw new Error(`Unknown categories: ${unknownNames.join(", ")}. Use --list for valid names.`);
  }

  const cacheDirectory = join(projectRoot, "data", ".cache");
  await mkdir(options.outputDir, { recursive: true });
  await mkdir(cacheDirectory, { recursive: true });

  const pendingCategories = [];
  for (const name of selectedNames) {
    const suffix = options.limit === null ? "" : `.sample-${options.limit}`;
    const outputPath = join(options.outputDir, `meta_${name}${suffix}.jsonl.gz`);
    if (options.force || (await pathSize(outputPath)) === null) {
      pendingCategories.push(categoryByName.get(name));
    }
  }
  await assertEnoughDiskSpace({
    cacheDirectory,
    categories: pendingCategories,
    outputDirectory: options.outputDir,
  });

  for (const name of selectedNames) {
    const category = categoryByName.get(name);
    const sourceUrl = `${catalog.metadataBaseUrl}/meta_${name}.jsonl.gz`;
    const suffix = options.limit === null ? "" : `.sample-${options.limit}`;
    const outputPath = join(options.outputDir, `meta_${name}${suffix}.jsonl.gz`);

    console.log(`\n[${name}]`);
    if (!options.force && (await pathSize(outputPath)) !== null) {
      console.log(`  Skipping existing output: ${outputPath}`);
      continue;
    }

    const sourcePath = await downloadSource({
      cacheDirectory,
      category: name,
      expectedBytes: category.compressedBytes,
      sourceUrl,
    });
    const entry = await transformCategory({
      category: name,
      force: options.force,
      limit: options.limit,
      outputPath,
      sourcePath,
    });

    if (entry) {
      await updateManifest(options.outputDir, entry);
      console.log(
        `  Wrote ${entry.productCount.toLocaleString()} products (${formatBytes(entry.outputBytes)}) to ${outputPath}`,
      );
    }
    if (!options.keepSource) await rm(sourcePath, { force: true });
  }
}

main().catch((error) => {
  console.error(`\nError: ${error.message}`);
  process.exitCode = 1;
});
