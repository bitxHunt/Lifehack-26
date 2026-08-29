import { NextResponse } from "next/server";

import { QUERIES } from "@/lib/catalog";
import { competitorProducts, coverage, customShelfSummary, explainLoss, runQuery } from "@/lib/simulator";
import type { ListingScoreRequest, ListingScoreResponse, Product, QueryView } from "@/lib/types";

const DRAFT_ID = "draft-listing";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ListingScoreRequest>;

  if (!body.name?.trim() || !Array.isArray(body.content) || body.content.length === 0) {
    return NextResponse.json({ error: "name and content are required" }, { status: 400 });
  }

  const draft: Product = {
    id: DRAFT_ID,
    name: body.name,
    brand: body.brand || "Your brand",
    price_sgd: Number(body.price_sgd) || 0,
    is_ours: true,
    content: body.content,
    truth: body.facts ?? {},
  };

  const competitors = competitorProducts();
  const products = [draft, ...competitors];

  const views: Record<string, QueryView> = Object.fromEntries(
    QUERIES.map((q) => [
      q.id,
      {
        ranking: runQuery(q, undefined, products),
        explanation: explainLoss(q, undefined, DRAFT_ID, products),
      },
    ]),
  );

  const response: ListingScoreResponse = {
    queries: QUERIES.map((q) => ({ id: q.id, text: q.text })),
    views,
    coverage: coverage(DRAFT_ID, undefined, products),
    ...customShelfSummary(draft, competitors),
  };

  return NextResponse.json(response);
}
