import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";
import type { Run, Runner } from "./types";

const RUNNERS_KEY = "runners";
const RUNS_INDEX = "runs:index";
const runKey = (id: string) => `runs:${id}`;
const runnerIndexKey = (runnerId: string) => `runs:byRunner:${runnerId}`;

export async function getRunners(): Promise<Runner[]> {
  const raw = await kv.get<Runner[]>(RUNNERS_KEY);
  return raw ?? [];
}

export async function setRunners(runners: Runner[]): Promise<void> {
  await kv.set(RUNNERS_KEY, runners);
}

export async function getRunner(id: string): Promise<Runner | null> {
  const runners = await getRunners();
  return runners.find((r) => r.id === id) ?? null;
}

export async function getRun(id: string): Promise<Run | null> {
  return (await kv.get<Run>(runKey(id))) ?? null;
}

export async function getRunsByIds(ids: string[]): Promise<Run[]> {
  if (ids.length === 0) return [];
  const pipeline = kv.pipeline();
  ids.forEach((id) => pipeline.get<Run>(runKey(id)));
  const results = (await pipeline.exec()) as (Run | null)[];
  return results.filter((r): r is Run => Boolean(r));
}

export async function saveRun(input: Omit<Run, "id" | "createdAt"> & { id?: string; createdAt?: number }): Promise<Run> {
  const id = input.id ?? nanoid(10);
  const createdAt = input.createdAt ?? Date.now();
  const run: Run = {
    id,
    runnerId: input.runnerId,
    distanceKm: input.distanceKm,
    durationSeconds: input.durationSeconds,
    paceSecondsPerKm: input.paceSecondsPerKm,
    sourceType: input.sourceType,
    confidence: input.confidence,
    reaction: input.reaction,
    photoUrl: input.photoUrl,
    createdAt,
    note: input.note,
  };
  await Promise.all([
    kv.set(runKey(id), run),
    kv.zadd(RUNS_INDEX, { score: createdAt, member: id }),
    kv.zadd(runnerIndexKey(input.runnerId), { score: createdAt, member: id }),
  ]);
  return run;
}

export async function getFeedPage(opts: { limit?: number; cursor?: number } = {}): Promise<{ runs: Run[]; nextCursor: number | null }> {
  const limit = opts.limit ?? 20;
  // byScore + rev: start = max score, stop = min score; use "+inf" / "-inf" for unbounded
  const max: number | "+inf" = opts.cursor !== undefined ? opts.cursor - 1 : "+inf";
  const ids = (await kv.zrange<string[]>(RUNS_INDEX, max, "-inf", {
    byScore: true,
    rev: true,
    offset: 0,
    count: limit + 1,
  })) as string[];

  const hasMore = ids.length > limit;
  const pageIds = ids.slice(0, limit);
  const runs = await getRunsByIds(pageIds);
  const nextCursor = hasMore && runs.length > 0 ? runs[runs.length - 1].createdAt : null;
  return { runs, nextCursor };
}

export async function getRecentRunsForRunner(runnerId: string, n = 5): Promise<Run[]> {
  const ids = (await kv.zrange<string[]>(runnerIndexKey(runnerId), 0, n - 1, {
    rev: true,
  })) as string[];
  return getRunsByIds(ids);
}

export async function getAllRunsForRunner(runnerId: string, sinceMs?: number): Promise<Run[]> {
  const min = sinceMs ?? 0;
  const ids = (await kv.zrange<string[]>(runnerIndexKey(runnerId), min, "+inf", {
    byScore: true,
  })) as string[];
  return getRunsByIds(ids);
}

export async function getAllRunsSince(sinceMs: number): Promise<Run[]> {
  const ids = (await kv.zrange<string[]>(RUNS_INDEX, sinceMs, "+inf", {
    byScore: true,
  })) as string[];
  return getRunsByIds(ids);
}

export async function getWeeklyKm(runnerId: string): Promise<number> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const runs = await getAllRunsForRunner(runnerId, weekAgo);
  return runs.reduce((sum, r) => sum + r.distanceKm, 0);
}
