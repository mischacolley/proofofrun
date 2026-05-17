export type Runner = {
  id: string;
  name: string;
  emoji: string;
};

export type SourceType =
  | "treadmill"
  | "watch"
  | "strava"
  | "phone"
  | "selfie"
  | "other";

export type Confidence = "high" | "medium" | "low";

export type Run = {
  id: string;
  runnerId: string;
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  sourceType: SourceType;
  confidence: Confidence;
  reaction: string;
  photoUrl: string;
  createdAt: number;
  note?: string;
};

export type RunWithRunner = Run & { runner: Runner };

export type AnalyseResult = {
  distanceKm: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  sourceType: SourceType;
  confidence: Confidence;
  reaction: string;
};

export type LeaderboardPeriod = "week" | "month" | "all";
export type LeaderboardSort =
  | "totalKm"
  | "longestRun"
  | "bestPace"
  | "currentStreak";

export type LeaderboardRow = {
  runner: Runner;
  totalKm: number;
  longestRunKm: number;
  bestPaceSecondsPerKm: number | null;
  currentStreakDays: number;
  runCount: number;
  lastRun: Run | null;
};
