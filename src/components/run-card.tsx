import Image from "next/image";
import { Card } from "@/components/ui/card";
import { formatDistance, formatDuration, formatPace, formatRelative } from "@/lib/format";
import type { RunWithRunner } from "@/lib/types";

export function RunCard({ run }: { run: RunWithRunner }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex gap-3 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
          {run.photoUrl && (
            <Image
              src={run.photoUrl}
              alt={`${run.runner.name} run`}
              fill
              className="object-cover"
              sizes="96px"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium truncate">
              {run.runner.name} {run.runner.emoji}
            </div>
            <div className="text-xs text-muted-foreground shrink-0">
              {formatRelative(run.createdAt)}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDistance(run.distanceKm)} · {formatDuration(run.durationSeconds)} ·{" "}
            {formatPace(run.paceSecondsPerKm)}
          </div>
          <p className="text-sm">{run.reaction}</p>
          {run.note && <p className="text-xs text-muted-foreground italic">“{run.note}”</p>}
        </div>
      </div>
    </Card>
  );
}
