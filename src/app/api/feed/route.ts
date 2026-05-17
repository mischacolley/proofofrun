import { NextResponse } from "next/server";
import { getFeedPage, getRunners } from "@/lib/kv";
import type { RunWithRunner } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);
    const cursorParam = url.searchParams.get("cursor");
    const cursor = cursorParam ? Number(cursorParam) : undefined;

    const [{ runs, nextCursor }, runners] = await Promise.all([
      getFeedPage({ limit, cursor: Number.isFinite(cursor) ? cursor : undefined }),
      getRunners(),
    ]);

    const byId = new Map(runners.map((r) => [r.id, r]));
    const enriched: RunWithRunner[] = runs
      .map((run) => {
        const runner = byId.get(run.runnerId);
        if (!runner) return null;
        return { ...run, runner };
      })
      .filter((r): r is RunWithRunner => r !== null);

    return NextResponse.json({ runs: enriched, nextCursor });
  } catch (err) {
    console.error("[feed GET] error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
