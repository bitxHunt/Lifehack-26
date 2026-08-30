import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const sourcePath = resolve(process.argv[2] ?? "data/index/amazon-fashion.sqlite");
const outputPath = resolve(process.argv[3] ?? "data/catalog/amazon-fashion-demo.sqlite");
const targetSize = Number(process.argv[4] ?? 10000);

if (!existsSync(sourcePath)) {
  throw new Error(`Full Amazon Fashion index was not found at ${sourcePath}`);
}
if (!Number.isInteger(targetSize) || targetSize < 100) {
  throw new Error("Demo catalog size must be an integer of at least 100 products.");
}

const targetAsins = ["B0811M2JG9", "B07SB2892S", "B08FMLXY1Z", "B079J6WGYY", "B015WXZSZ6"];
const scenarioQueries = [
  "sandals OR beach OR marine OR artwork OR lightweight OR comfort",
  "compression OR sleeve OR calf OR breathable OR nurse OR fatigue",
  "sweatshirt OR colorful OR pockets OR pullover OR budget OR student",
  "Jerry OR Garcia OR Volkswagen OR vintage OR music OR shirt",
  "pumps OR heels OR office OR formal OR platform OR comfort",
];

mkdirSync(dirname(outputPath), { recursive: true });
if (existsSync(outputPath)) rmSync(outputPath);

const source = new DatabaseSync(sourcePath, { readOnly: true });
const output = new DatabaseSync(outputPath);
output.exec("PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA temp_store = MEMORY;");
output.exec(`
  CREATE TABLE catalog_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE products (
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
  CREATE VIRTUAL TABLE products_fts USING fts5(
    title, brand, features, description, details, categories,
    content='products', content_rowid='id',
    tokenize='unicode61 remove_diacritics 2'
  );
`);

const columns = [
  "id", "parent_asin", "title", "brand", "price", "average_rating", "rating_number",
  "description", "features", "details", "categories", "image_url", "amazon_url",
];
const insertProduct = output.prepare(`
  INSERT OR IGNORE INTO products (${columns.join(", ")})
  VALUES (${columns.map(() => "?").join(", ")})
`);
const selected = new Set();

function addRows(rows) {
  for (const row of rows) {
    if (selected.size >= targetSize || selected.has(row.parent_asin)) continue;
    insertProduct.run(...columns.map((column) => row[column]));
    selected.add(row.parent_asin);
  }
}

output.exec("BEGIN IMMEDIATE");
try {
  const targetPlaceholders = targetAsins.map(() => "?").join(", ");
  addRows(source.prepare(`SELECT ${columns.join(", ")} FROM products WHERE parent_asin IN (${targetPlaceholders})`).all(...targetAsins));

  const perScenario = Math.ceil(targetSize / scenarioQueries.length);
  const retrieveScenario = source.prepare(`
    SELECT ${columns.map((column) => `p.${column}`).join(", ")}
    FROM products_fts
    JOIN products p ON p.id = products_fts.rowid
    WHERE products_fts MATCH ?
    ORDER BY bm25(products_fts, 8.0, 3.0, 5.0, 2.0, 1.0, 1.0), p.rating_number DESC
    LIMIT ?
  `);
  for (const query of scenarioQueries) {
    addRows(retrieveScenario.all(query, perScenario + 300));
  }

  if (selected.size < targetSize) {
    const fillRows = source.prepare(`
      SELECT ${columns.join(", ")} FROM products
      ORDER BY abs((id * 1103515245 + 12345) % 2147483647)
      LIMIT ?
    `).all(Math.min(targetSize * 3, 20000));
    addRows(fillRows);
  }

  output.exec(`
    INSERT INTO products_fts(rowid, title, brand, features, description, details, categories)
    SELECT id, title, brand, features, description, details, categories FROM products;
  `);
  const meta = output.prepare("INSERT INTO catalog_meta (key, value) VALUES (?, ?)");
  meta.run("product_count", String(selected.size));
  meta.run("source_product_count", String(source.prepare("SELECT COUNT(*) AS count FROM products").get().count));
  meta.run("selection_strategy", "five-scenario-stratified-v1");
  output.exec("COMMIT");
  output.exec("INSERT INTO products_fts(products_fts) VALUES('optimize'); PRAGMA optimize; VACUUM;");
} catch (error) {
  output.exec("ROLLBACK");
  throw error;
} finally {
  source.close();
  output.close();
}

console.log(`Demo catalog complete: ${selected.size.toLocaleString()} products at ${outputPath}`);
