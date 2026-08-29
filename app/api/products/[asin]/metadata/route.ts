import { z } from "zod";

import { getProduct } from "@/lib/shop-products";

export const dynamic = "force-dynamic";

const productDraftSchema = z.object({
  parent_asin: z.string().length(10),
  title: z.string().trim().min(1).max(240),
  store: z.string().trim().min(1).max(120),
  price: z.number().nonnegative().max(1_000_000),
  description: z.string().trim().min(1).max(5000),
  features: z.array(z.string().trim().min(1).max(600)).min(1).max(16),
  details: z.record(z.string(), z.string().max(600)),
});

type StoredProduct = ReturnType<typeof getProduct>;

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/products/[asin]/metadata">,
) {
  const { asin: rawAsin } = await context.params;
  const asin = rawAsin.toUpperCase();
  const existingProduct = getProduct(asin);
  if (!existingProduct) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "The request body must be valid JSON." }, { status: 400 });
  }

  const parsed = productDraftSchema.safeParse(body);
  if (!parsed.success || parsed.data.parent_asin !== asin) {
    return Response.json({ error: "Check the product metadata and try again." }, { status: 400 });
  }

  try {
    const fsModule = ["node", "fs/promises"].join(":");
    const pathModule = ["node", "path"].join(":");
    const [{ readFile, writeFile }, { resolve }] = await Promise.all([
      import(/* webpackIgnore: true */ fsModule) as Promise<typeof import("node:fs/promises")>,
      import(/* webpackIgnore: true */ pathModule) as Promise<typeof import("node:path")>,
    ]);
    const sourcePath = resolve(process.cwd(), "data", "amazon_fashion_5_complete_records.jsonl");
    const outputPath = resolve(process.cwd(), "data", "amazon_fashion_5_complete_records.json");
    const records = (await readFile(sourcePath, "utf8"))
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line)) as NonNullable<StoredProduct>[];
    const productIndex = records.findIndex((product) => product.parent_asin === asin);
    if (productIndex < 0) {
      return Response.json({ error: "Product source record not found." }, { status: 404 });
    }

    const draft = parsed.data;
    records[productIndex] = {
      ...records[productIndex],
      title: draft.title,
      store: draft.store,
      price: draft.price,
      description: [draft.description],
      features: draft.features,
      details: draft.details,
    };

    await Promise.all([
      writeFile(sourcePath, `${records.map((product) => JSON.stringify(product)).join("\n")}\n`, "utf8"),
      writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8"),
    ]);

    return Response.json({
      saved: true,
      asin,
      savedAt: new Date().toISOString(),
      message: "Product metadata and product page source updated.",
    });
  } catch (error) {
    console.error("Product metadata save failed", error);
    return Response.json({
      error: "This environment cannot save product metadata yet. Connect hosted product storage first.",
      code: "PRODUCT_STORAGE_NOT_CONFIGURED",
    }, { status: 503 });
  }
}
