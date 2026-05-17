import type { Runner } from "@/lib/types";

export function InactiveBanner({ runners }: { runners: Runner[] }) {
  if (runners.length === 0) return null;
  return (
    <div className="space-y-1">
      {runners.map((r) => (
        <div
          key={r.id}
          className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground"
        >
          Haven&apos;t seen <span className="font-medium text-foreground">{r.name} {r.emoji}</span> all week. Yeah? Nah.
        </div>
      ))}
    </div>
  );
}
