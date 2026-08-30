import { createClient, type Client, type Row } from "@libsql/client/web";

export type CatalogCandidate = {
  asin: string;
  title: string;
  brand: string;
  price: number | null;
  description: string;
  features: string[];
  details: Record<string, string>;
  categories: string[];
  rating: number;
  ratingCount: number;
  productUrl: string;
  imageUrl: string | null;
  retrievalScore: number;
};

export type CatalogSearchResult = {
  catalogSize: number;
  candidates: CatalogCandidate[];
  searchTerms: string[];
  source: "full-amazon-fashion-index";
};

const stopWords = new Set([
  "a", "an", "and", "are", "as", "at", "be", "for", "from", "in", "is",
  "it", "of", "on", "or", "that", "the", "their", "this", "to", "with",
  "who", "seeking", "want", "wants", "looking", "need", "needs", "year",
  "old", "use", "item", "product", "under",
]);

export function extractSearchTerms(intent: string) {
  return [...new Set(
    intent
      .toLowerCase()
      .replace(/[^a-z0-9$.-]+/g, " ")
      .split(/\s+/)
      .map((term) => term.replace(/^[-.$]+|[-.$]+$/g, ""))
      .filter((term) => term.length >= 3 && !stopWords.has(term)),
  )].slice(0, 18);
}

function safeArray(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function safeDetails(value: string): Record<string, string> {
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item)]));
  } catch {
    return {};
  }
}

type CatalogRow = {
  parent_asin: string;
  title: string;
  brand: string;
  price: number | null;
  average_rating: number;
  rating_number: number;
  description: string;
  features: string;
  details: string;
  categories: string;
  image_url: string | null;
  amazon_url: string;
  retrieval_score: number;
};

let tursoClient: Client | undefined;

function getTursoClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) return null;
  if (!authToken) throw new Error("TURSO_AUTH_TOKEN is required when TURSO_DATABASE_URL is configured.");
  tursoClient ??= createClient({ url, authToken });
  return tursoClient;
}

function remoteCatalogRow(row: Row): CatalogRow {
  return {
    parent_asin: String(row.parent_asin ?? ""),
    title: String(row.title ?? ""),
    brand: String(row.brand ?? ""),
    price: row.price == null ? null : Number(row.price),
    average_rating: Number(row.average_rating ?? 0),
    rating_number: Number(row.rating_number ?? 0),
    description: String(row.description ?? ""),
    features: String(row.features ?? "[]"),
    details: String(row.details ?? "{}"),
    categories: String(row.categories ?? "[]"),
    image_url: row.image_url == null ? null : String(row.image_url),
    amazon_url: String(row.amazon_url ?? ""),
    retrieval_score: Number(row.retrieval_score ?? 0),
  };
}

function uniqueCatalogRows(rows: CatalogRow[], limit: number) {
  const seenTitles = new Set<string>();
  return rows.filter((row) => {
    const titleKey = row.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seenTitles.has(titleKey)) return false;
    seenTitles.add(titleKey);
    return true;
  }).slice(0, limit);
}

function toCandidate(row: CatalogRow): CatalogCandidate {
  return {
    asin: row.parent_asin,
    title: row.title,
    brand: row.brand,
    price: row.price,
    description: row.description,
    features: safeArray(row.features),
    details: safeDetails(row.details),
    categories: safeArray(row.categories),
    rating: row.average_rating,
    ratingCount: row.rating_number,
    productUrl: `/shop/catalog/${row.parent_asin}`,
    imageUrl: row.image_url,
    retrievalScore: row.retrieval_score,
  };
}

async function openCatalogDatabase() {
  const moduleName = ["node", "sqlite"].join(":");
  const { DatabaseSync } = (await import(/* webpackIgnore: true */ moduleName)) as {
    DatabaseSync: new (path: string, options?: { readOnly?: boolean }) => {
      prepare(sql: string): {
        all(...params: unknown[]): CatalogRow[];
        get(...params: unknown[]): CatalogRow | { value?: string; count?: number } | undefined;
      };
      close(): void;
    };
  };
  const databasePath = process.env.CATALOG_DB_PATH ?? "data/catalog/amazon-fashion-demo.sqlite";
  return new DatabaseSync(databasePath, { readOnly: true });
}

export async function getCatalogProductByAsin(asin: string): Promise<CatalogCandidate | null> {
  const remoteDatabase = getTursoClient();
  if (remoteDatabase) {
    const result = await remoteDatabase.execute({
      sql: `
        SELECT
          parent_asin, title, brand, price, average_rating, rating_number,
          description, features, details, categories, image_url, amazon_url,
          0 AS retrieval_score
        FROM products
        WHERE parent_asin = ?
        LIMIT 1
      `,
      args: [asin],
    });
    return result.rows[0] ? toCandidate(remoteCatalogRow(result.rows[0])) : null;
  }

  let database;
  try {
    database = await openCatalogDatabase();
  } catch {
    throw new Error("The full Amazon Fashion search index is not ready. Run npm run data:index-fashion first.");
  }
  try {
    const row = database.prepare(`
      SELECT
        parent_asin, title, brand, price, average_rating, rating_number,
        description, features, details, categories, image_url, amazon_url,
        0 AS retrieval_score
      FROM products
      WHERE parent_asin = ?
      LIMIT 1
    `).get(asin) as CatalogRow | undefined;
    return row ? toCandidate(row) : null;
  } finally {
    database.close();
  }
}

export async function searchFullFashionCatalog(intent: string, limit = 24): Promise<CatalogSearchResult> {
  const searchTerms = extractSearchTerms(intent);
  if (searchTerms.length === 0) {
    throw new Error("The buyer intent does not contain enough searchable product terms.");
  }

  const remoteUrl = process.env.CATALOG_SEARCH_URL;
  if (remoteUrl) {
    const response = await fetch(remoteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CATALOG_SEARCH_TOKEN
          ? { Authorization: `Bearer ${process.env.CATALOG_SEARCH_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({ intent, limit }),
    });
    if (!response.ok) throw new Error(`The catalog search service returned ${response.status}.`);
    return (await response.json()) as CatalogSearchResult;
  }

  const remoteDatabase = getTursoClient();
  if (remoteDatabase) {
    const query = searchTerms.map((term) => `"${term.replaceAll('"', '""')}"`).join(" OR ");
    const [searchResult, countResult] = await Promise.all([
      remoteDatabase.execute({
        sql: `
          SELECT
            p.parent_asin, p.title, p.brand, p.price, p.average_rating,
            p.rating_number, p.description, p.features, p.details, p.categories,
            p.image_url, p.amazon_url,
            -bm25(products_fts, 8.0, 3.0, 5.0, 2.0, 1.0, 1.0) AS retrieval_score
          FROM products_fts
          JOIN products p ON p.id = products_fts.rowid
          WHERE products_fts MATCH ?
          ORDER BY retrieval_score DESC, p.rating_number DESC
          LIMIT ?
        `,
        args: [query, Math.min(limit * 10, 250)],
      }),
      remoteDatabase.execute("SELECT COUNT(*) AS count FROM products"),
    ]);
    const rows = uniqueCatalogRows(searchResult.rows.map(remoteCatalogRow), limit);
    return {
      catalogSize: Number(countResult.rows[0]?.count ?? 0),
      candidates: rows.map(toCandidate),
      searchTerms,
      source: "full-amazon-fashion-index",
    };
  }

  let database;
  try {
    database = await openCatalogDatabase();
  } catch {
    throw new Error("The full Amazon Fashion search index is not ready. Run npm run data:index-fashion first.");
  }

  try {
    const query = searchTerms.map((term) => `\"${term.replaceAll('"', '""')}\"`).join(" OR ");
    const rows = database.prepare(`
      SELECT
        p.parent_asin, p.title, p.brand, p.price, p.average_rating,
        p.rating_number, p.description, p.features, p.details, p.categories,
        p.image_url, p.amazon_url,
        -bm25(products_fts, 8.0, 3.0, 5.0, 2.0, 1.0, 1.0) AS retrieval_score
      FROM products_fts
      JOIN products p ON p.id = products_fts.rowid
      WHERE products_fts MATCH ?
      ORDER BY retrieval_score DESC, p.rating_number DESC
      LIMIT ?
    `).all(query, Math.min(limit * 10, 250));
    const uniqueRows = uniqueCatalogRows(rows, limit);
    const catalogSize = Number((database.prepare("SELECT COUNT(*) AS count FROM products").get() as { count?: number } | undefined)?.count ?? 0);
    return {
      catalogSize,
      candidates: uniqueRows.map(toCandidate),
      searchTerms,
      source: "full-amazon-fashion-index",
    };
  } finally {
    database.close();
  }
}
