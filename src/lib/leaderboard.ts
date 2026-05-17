import type { LeaderboardPeriod, LeaderboardRow, LeaderboardSort, Run, Runner } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

export function periodStart(period: LeaderboardPeriod, now = Date.now()): number {
  if (period === "all") return 0;
  if (period === "week") return now - 7 * DAY_MS;
  if (period === "month") return now - 30 * DAY_MS;
  return 0;
}

function computeStreak(runs: Run[], now = Date.now()): number {
  if (runs.length === 0) return 0;
  // Distinct local-day buckets, sorted newest first
  const dayKeys = new Set<number>();
  for (const r of runs) {
    const d = new Date(r.createdAt);
    d.setHours(0, 0, 0, 0);
    dayKeys.add(d.getTime());
  }
  const days = [...dayKeys].sort((a, b) => b - a);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  // Streak must include today or yesterday to be active
  if (days[0] !== todayMs && days[0] !== todayMs - DAY_MS) return 0;

  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i - 1] - days[i] === DAY_MS) streak++;
    else break;
  }
  return streak;
}

export function buildLeaderboard(
  runners: Runner[],
  runs: Run[],
  period: LeaderboardPeriod,
  sortBy: LeaderboardSort,
): LeaderboardRow[] {
  const since = periodStart(period);
  const byRunner = new Map<string, Run[]>();
  runners.forEach((r) => byRunner.set(r.id, []));
  for (const run of runs) {
    if (run.createdAt < since) continue;
    const list = byRunner.get(run.runnerId);
    if (list) list.push(run);
  }

  const rows: LeaderboardRow[] = runners.map((runner) => {
    const list = byRunner.get(runner.id) ?? [];
    const totalKm = list.reduce((s, r) => s + r.distanceKm, 0);
    const longestRunKm = list.reduce((m, r) => Math.max(m, r.distanceKm), 0);
    const bestPaceSecondsPerKm = list.length
      ? list.reduce(
          (m, r) => (r.paceSecondsPerKm > 0 && (m === null || r.paceSecondsPerKm < m) ? r.paceSecondsPerKm : m),
          null as number | null,
        )
      : null;
    const sorted = [...list].sort((a, b) => b.createdAt - a.createdAt);
    return {
      runner,
      totalKm,
      longestRunKm,
      bestPaceSecondsPerKm,
      currentStreakDays: computeStreak(list),
      runCount: list.length,
      lastRun: sorted[0] ?? null,
    };
  });

  rows.sort((a, b) => {
    switch (sortBy) {
      case "totalKm":
        return b.totalKm - a.totalKm;
      case "longestRun":
        return b.longestRunKm - a.longestRunKm;
      case "bestPace": {
        const av = a.bestPaceSecondsPerKm ?? Number.POSITIVE_INFINITY;
        const bv = b.bestPaceSecondsPerKm ?? Number.POSITIVE_INFINITY;
        return av - bv;
      }
      case "currentStreak":
        return b.currentStreakDays - a.currentStreakDays;
    }
  });

  return rows;
}
