import { NextResponse } from "next/server";
import { getRunners } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runners = await getRunners();
    return NextResponse.json({ runners });
  } catch (err) {
    console.error("[runners GET] error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
