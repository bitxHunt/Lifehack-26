import { NextResponse } from "next/server";

import { BRAND_PRODUCT_ID, QUERIES, getProduct } from "@/lib/catalog";
import { shelfReport } from "@/lib/simulator";

export function GET() {
  const product = getProduct(BRAND_PRODUCT_ID);
  return NextResponse.json({
    report: shelfReport(),
    product: {
      name: product.name,
      price_sgd: product.price_sgd,
      content: product.content,
    },
    queries: QUERIES.map((q) => ({ id: q.id, text: q.text })),
  });
}
