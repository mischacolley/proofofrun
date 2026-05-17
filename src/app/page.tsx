import { getFeedPage, getRunners, getAllRunsForRunner } from "@/lib/kv";
import { RunCard } from "@/components/run-card";
import { SubmitRunDialog } from "@/components/submit-run-dialog";
import { InactiveBanner } from "@/components/inactive-banner";
import type { Runner, RunWithRunner } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadInactiveRunners(runners: Runner[]): Promise<Runner[]> {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const results = await Promise.all(
    runners.map(async (r) => {
      const recent = await getAllRunsForRunner(r.id, sevenDaysAgo);
      return recent.length === 0 ? r : null;
    }),
  );
  return results.filter((r): r is Runner => r !== null);
}

export default async function Home() {
  const [runners, { runs }] = await Promise.all([
    getRunners(),
    getFeedPage({ limit: 20 }),
  ]);
  const byId = new Map(runners.map((r) => [r.id, r]));
  const enriched: RunWithRunner[] = runs
    .map((r) => {
      const runner = byId.get(r.runnerId);
      return runner ? { ...r, runner } : null;
    })
    .filter((r): r is RunWithRunner => r !== null);

  const inactive = runners.length > 0 ? await loadInactiveRunners(runners) : [];

  return (
    <div className="space-y-6">
      <SubmitRunDialog runners={runners} />

      {inactive.length > 0 && <InactiveBanner runners={inactive} />}

      <div className="space-y-3">
        {enriched.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground">
            Nobody&apos;s run yet. Yeah nah, prove it.
          </div>
        ) : (
          enriched.map((run) => <RunCard key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
