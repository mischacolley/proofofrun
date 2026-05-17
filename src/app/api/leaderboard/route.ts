import { NextResponse } from "next/server";
import { getAllRunsSince, getRunners } from "@/lib/kv";
import { buildLeaderboard, periodStart } from "@/lib/leaderboard";
import type { LeaderboardPeriod, LeaderboardSort } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIODS: LeaderboardPeriod[] = ["week", "month", "all"];
const SORTS: LeaderboardSort[] = ["totalKm", "longestRun", "bestPace", "currentStreak"];

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const period = (url.searchParams.get("period") ?? "week") as LeaderboardPeriod;
    const sortBy = (url.searchParams.get("sortBy") ?? "totalKm") as LeaderboardSort;
    if (!PERIODS.includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }
    if (!SORTS.includes(sortBy)) {
      return NextResponse.json({ error: "Invalid sortBy" }, { status: 400 });
    }

    const [runners, runs] = await Promise.all([
      getRunners(),
      getAllRunsSince(periodStart(period)),
    ]);
    const rows = buildLeaderboard(runners, runs, period, sortBy);
    return NextResponse.json({ rows, period, sortBy });
  } catch (err) {
    console.error("[leaderboard GET] error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
