import { NextResponse } from "next/server";

import { getQuery } from "@/lib/catalog";
import { explainLoss, runQuery } from "@/lib/simulator";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let query;
  try {
    query = getQuery(id);
  } catch {
    return NextResponse.json({ error: "Unknown id" }, { status: 404 });
  }

  return NextResponse.json({
    ranking: runQuery(query),
    explanation: explainLoss(query),
  });
}
