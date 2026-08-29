import { NextResponse } from "next/server";

import { coverage } from "@/lib/simulator";

export function GET() {
  return NextResponse.json(coverage());
}
