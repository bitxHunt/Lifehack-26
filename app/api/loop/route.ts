import { NextResponse } from "next/server";

import { optimisationLoop } from "@/lib/fixer";

export function GET() {
  return NextResponse.json(optimisationLoop());
}
