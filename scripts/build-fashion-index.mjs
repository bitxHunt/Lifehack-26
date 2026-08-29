import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { DatabaseSync } from "node:sqlite";

const sourcePath = resolve(process.argv[2] ?? "data/meta_Amazon_Fashion.jsonl");
const databasePath = resolve(process.argv[3] ?? "data/index/amazon-fashion.sqlite");

if (!existsSync(sourcePath)) {
  throw new Error(`Amazon Fashion metadata was not found at ${sourcePath}`);
}

mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA journal_mode = WAL");
database.exec("PRAGMA synchronous = NORMAL");
database.exec("PRAGMA temp_store = MEMORY");
database.exec("PRAGMA cache_size = -200000");

database.exec(`
  CREATE TABLE IF NOT EXISTS catalog_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    parent_asin TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT '',
    price REAL,
    average_rating REAL NOT NULL DEFAULT 0,
    rating_number INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    features TEXT NOT NULL DEFAULT '[]',
    details TEXT NOT NULL DEFAULT '{}',
    categories TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    amazon_url TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
    title,
    brand,
    features,
    description,
    details,
    categories,
    content='products',
    content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
  );
`);

const existingSourceSize = database
  .prepare("SELECT value FROM catalog_meta WHERE key = 'source_size'")
  .get()?.value;
const storedProductCount = Number(
  database.prepare("SELECT value FROM catalog_meta WHERE key = 'product_count'").get()?.value ?? 0,
);
const indexedCount = Number(
  database.prepare("SELECT COUNT(*) AS count FROM products").get()?.count ?? 0,
);
const currentSourceSize = String(statSync(sourcePath).size);

if (
  existingSourceSize === currentSourceSize &&
  storedProductCount > 0 &&
  indexedCount === storedProductCount
) {
  console.log(`Catalog index is current: ${indexedCount.toLocaleString()} products at ${databasePath}`);
  database.close();
  process.exit(0);
}

database.exec("DELETE FROM products_fts");
database.exec("DELETE FROM products");
database.exec("DELETE FROM catalog_meta");

const insertProduct = database.prepare(`
  INSERT INTO products (
    parent_asin, title, brand, price, average_rating, rating_number,
    description, features, details, categories, image_url, amazon_url
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const insertSearch = database.prepare(`
  INSERT INTO products_fts (
    rowid, title, brand, features, description, details, categories
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const begin = database.prepare("BEGIN IMMEDIATE");
const commit = database.prepare("COMMIT");
const rollback = database.prepare("ROLLBACK");

const lines = createInterface({
  input: createReadStream(sourcePath, { encoding: "utf8" }),
  crlfDelay: Infinity,
});

let inserted = 0;
let skipped = 0;
let inTransaction = false;

function textList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").join(" \u2022 ")
    : "";
}

function mainImage(images) {
  if (!Array.isArray(images)) return null;
  const image = images.find((candidate) => candidate?.variant === "MAIN") ?? images[0];
  return image?.hi_res ?? image?.large ?? image?.thumb ?? null;
}

try {
  begin.run();
  inTransaction = true;

  for await (const line of lines) {
    if (!line.trim()) continue;

    try {
      const product = JSON.parse(line);
      if (!product.parent_asin || !product.title) {
        skipped += 1;
        continue;
      }

      const description = textList(product.description);
      const featureText = textList(product.features);
      const details = product.details && typeof product.details === "object" ? product.details : {};
      const detailText = Object.entries(details)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" \u2022 ");
      const categoryText = textList(product.categories);

      const productResult = insertProduct.run(
        String(product.parent_asin),
        String(product.title),
        typeof product.store === "string" ? product.store : "",
        typeof product.price === "number" ? product.price : null,
        typeof product.average_rating === "number" ? product.average_rating : 0,
        Number.isInteger(product.rating_number) ? product.rating_number : 0,
        description,
        JSON.stringify(Array.isArray(product.features) ? product.features : []),
        JSON.stringify(details),
        JSON.stringify(Array.isArray(product.categories) ? product.categories : []),
        mainImage(product.images),
        `https://www.amazon.com/dp/${product.parent_asin}`,
      );

      insertSearch.run(
        Number(productResult.lastInsertRowid),
        String(product.title),
        typeof product.store === "string" ? product.store : "",
        featureText,
        description,
        detailText,
        categoryText,
      );

      inserted += 1;
      if (inserted % 10_000 === 0) {
        commit.run();
        begin.run();
        console.log(`Indexed ${inserted.toLocaleString()} products...`);
      }
    } catch {
      skipped += 1;
    }
  }

  commit.run();
  inTransaction = false;
  database.prepare("INSERT INTO catalog_meta (key, value) VALUES (?, ?)").run("source_size", currentSourceSize);
  database.prepare("INSERT INTO catalog_meta (key, value) VALUES (?, ?)").run("product_count", String(inserted));
  database.prepare("INSERT INTO catalog_meta (key, value) VALUES (?, ?)").run("source_path", sourcePath);
  database.exec("INSERT INTO products_fts(products_fts) VALUES('optimize')");
  database.exec("PRAGMA optimize");
} catch (error) {
  if (inTransaction) rollback.run();
  throw error;
} finally {
  database.close();
}

console.log(`Catalog index complete: ${inserted.toLocaleString()} products (${skipped.toLocaleString()} skipped) at ${databasePath}`);
