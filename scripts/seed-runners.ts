/**
 * Seed the `runners` KV key with the crew.
 *
 * Usage:
 *   1. `vercel env pull` so KV_* env vars are available
 *   2. `npx tsx scripts/seed-runners.ts`
 *
 * Edit the `RUNNERS` array below before running — these are placeholders.
 */
import { config } from "dotenv";
import { setRunners } from "../src/lib/kv";
import type { Runner } from "../src/lib/types";

config({ path: ".env.local" });

const RUNNERS: Runner[] = [
  { id: "runner-1", name: "Misch", emoji: "🏃‍♂️" },
  { id: "runner-2", name: "Kell", emoji: "🏃‍♂️" },
  { id: "runner-3", name: "Nim", emoji: "🏃‍♂️" },
  { id: "runner-4", name: "Arty", emoji: "🏃‍♂️" },
  { id: "runner-5", name: "V", emoji: "🏃‍♂️" },
];

async function main() {
  await setRunners(RUNNERS);
  console.log(`Seeded ${RUNNERS.length} runners:`);
  RUNNERS.forEach((r) => console.log(`  ${r.emoji} ${r.name} (${r.id})`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
