import { NextResponse } from "next/server";

import { unbackedClaims } from "@/lib/simulator";

export function GET() {
  return NextResponse.json({ flags: unbackedClaims() });
}
