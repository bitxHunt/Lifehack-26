import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(
  projectRoot,
  "data",
  "amazon_fashion_5_complete_records.jsonl",
);
const outputPath = join(
  projectRoot,
  "data",
  "amazon_fashion_5_complete_records.json",
);

const records = (await readFile(sourcePath, "utf8"))
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(
        `Invalid JSONL record at line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

if (records.length !== 5) {
  throw new Error(`Expected 5 product records, found ${records.length}.`);
}

await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
console.log(`Prepared ${records.length} shop products.`);
