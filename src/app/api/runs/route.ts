import { NextResponse } from "next/server";
import { saveRun, getRunner } from "@/lib/kv";
import type { Run } from "@/lib/types";

export const runtime = "nodejs";

type Body = Omit<Run, "id" | "createdAt"> & { createdAt?: number };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const required: (keyof Body)[] = [
      "runnerId",
      "distanceKm",
      "durationSeconds",
      "paceSecondsPerKm",
      "sourceType",
      "confidence",
      "reaction",
      "photoUrl",
    ];
    for (const key of required) {
      if (body[key] === undefined || body[key] === null || body[key] === "") {
        return NextResponse.json({ error: `Missing field: ${key}` }, { status: 400 });
      }
    }

    const runner = await getRunner(body.runnerId);
    if (!runner) {
      return NextResponse.json({ error: "Unknown runner" }, { status: 404 });
    }

    const run = await saveRun(body);
    return NextResponse.json({ run });
  } catch (err) {
    console.error("[runs POST] error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
