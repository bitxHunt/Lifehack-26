import { NextResponse } from "next/server";

import { suggestFixes } from "@/lib/fixer";

export function GET() {
  return NextResponse.json({ fixes: suggestFixes() });
}
