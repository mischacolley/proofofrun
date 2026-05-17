import { LeaderboardView } from "@/components/leaderboard-view";

export const metadata = {
  title: "Leaderboard · Proof of Run",
};

export default function LeaderboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Who&apos;s actually pulling their weight.</p>
      </div>
      <LeaderboardView />
    </div>
  );
}
