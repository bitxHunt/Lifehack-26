import { NextResponse } from "next/server";

import { draftListingContent } from "@/lib/agent";
import type { ListingDraftRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ListingDraftRequest>;

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await draftListingContent({
    name: body.name,
    brand: body.brand,
    price_sgd: body.price_sgd,
    notes: body.notes,
    facts: body.facts,
    photo_data_url: body.photo_data_url,
  });

  return NextResponse.json(result);
}
