"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistance, formatPace } from "@/lib/format";
import type {
  LeaderboardPeriod,
  LeaderboardRow,
  LeaderboardSort,
} from "@/lib/types";

const SORT_LABELS: Record<LeaderboardSort, string> = {
  totalKm: "Total km",
  longestRun: "Longest run",
  bestPace: "Best pace",
  currentStreak: "Current streak",
};

function statForSort(row: LeaderboardRow, sort: LeaderboardSort): string {
  switch (sort) {
    case "totalKm":
      return formatDistance(row.totalKm);
    case "longestRun":
      return formatDistance(row.longestRunKm);
    case "bestPace":
      return row.bestPaceSecondsPerKm
        ? formatPace(row.bestPaceSecondsPerKm)
        : "—";
    case "currentStreak":
      return row.currentStreakDays === 0
        ? "—"
        : `${row.currentStreakDays} day${row.currentStreakDays === 1 ? "" : "s"}`;
  }
}

type FetchState =
  | { status: "loading"; key: string }
  | { status: "ok"; key: string; rows: LeaderboardRow[] }
  | { status: "error"; key: string; error: string };

export function LeaderboardView() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("week");
  const [sortBy, setSortBy] = useState<LeaderboardSort>("totalKm");
  const requestKey = `${period}:${sortBy}`;
  const [state, setState] = useState<FetchState>({
    status: "loading",
    key: requestKey,
  });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/leaderboard?period=${period}&sortBy=${sortBy}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed (${r.status})`);
        return r.json();
      })
      .then((data: { rows: LeaderboardRow[] }) => {
        if (!cancelled)
          setState({ status: "ok", key: requestKey, rows: data.rows });
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            status: "error",
            key: requestKey,
            error: err instanceof Error ? err.message : "Failed to load",
          });
      });
    return () => {
      cancelled = true;
    };
  }, [period, sortBy, requestKey]);

  const loading = state.key !== requestKey || state.status === "loading";
  const rows = !loading && state.status === "ok" ? state.rows : null;
  const error = !loading && state.status === "error" ? state.error : null;

  return (
    <div className="space-y-4">
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as LeaderboardPeriod)}
      >
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Sort by</span>
        <Select
          value={sortBy}
          onValueChange={(v) => v && setSortBy(v as LeaderboardSort)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {(value: string | null) =>
                value ? SORT_LABELS[value as LeaderboardSort] : ""
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as LeaderboardSort[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {error && (
          <div className="rounded-md border border-dashed p-4 text-sm text-destructive">
            {error}
          </div>
        )}
        {!rows && !error && (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        )}
        {rows && rows.length === 0 && (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            Anybody run yet? Yeah nah, prove it.
          </div>
        )}
        {rows?.map((row, i) => (
          <Card key={row.runner.id} className="p-3">
            <div className="flex items-center gap-3">
              <div className="w-6 text-center text-sm text-muted-foreground tabular-nums">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">
                  {row.runner.emoji} {row.runner.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.runCount} run{row.runCount === 1 ? "" : "s"}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">
                  {statForSort(row, sortBy)}
                </div>
              </div>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                {row.lastRun?.photoUrl && (
                  <Image
                    src={row.lastRun.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
