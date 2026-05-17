import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { anthropic, VISION_MODEL } from "@/lib/anthropic";
import { getRunner, getRecentRunsForRunner, getWeeklyKm } from "@/lib/kv";
import type { AnalyseResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You're the AI commentator for "Proof of Run", a Bridge to Brisbane training group.
Tone: Aussie larrikin, affectionate piss-take, 2 sentences max for the reaction.
You're looking at photo evidence of a run — could be a treadmill display, watch face, Strava screenshot, or finish-line photo.

Extract stats from the photo and write a reaction. Adjust tone by performance:
- New PB or first run after 7+ day gap → encouragement with a cheeky edge
- Improvement on recent pace → hype with specific callback to their history
- Regression or short run → gentle roast, suggest excuses they probably used
- Suspicious photo (Netflix visible on treadmill, flat incline, etc.) → call it out

React to what's IN the photo, not just the numbers. Never about appearance, age, or anything below the belt. Never mean-spirited.

Return ONLY valid JSON, no markdown fences.`;

function buildUserPrompt(runnerName: string, recentRuns: unknown, weeklyKm: number) {
  return `Runner: ${runnerName}
Last 5 runs: ${JSON.stringify(recentRuns)}
This week so far: ${weeklyKm}km

Return JSON matching:
{
  "distanceKm": number,
  "durationSeconds": number,
  "paceSecondsPerKm": number,
  "sourceType": "treadmill" | "watch" | "strava" | "phone" | "selfie" | "other",
  "confidence": "high" | "medium" | "low",
  "reaction": "string, 2 sentences max"
}`;
}

function stripJsonFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

type AnthropicImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function normaliseMediaType(t: string): AnthropicImageMediaType {
  const lower = t.toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  if (
    lower === "image/jpeg" ||
    lower === "image/png" ||
    lower === "image/gif" ||
    lower === "image/webp"
  ) {
    return lower;
  }
  // Anthropic only supports the four above — fall back to jpeg
  return "image/jpeg";
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("photo");
    const runnerId = form.get("runnerId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing photo" }, { status: 400 });
    }
    if (typeof runnerId !== "string" || !runnerId) {
      return NextResponse.json({ error: "Missing runnerId" }, { status: 400 });
    }

    const runner = await getRunner(runnerId);
    if (!runner) {
      return NextResponse.json({ error: "Unknown runner" }, { status: 404 });
    }

    // Upload to Blob
    const ext = file.name.split(".").pop() ?? "jpg";
    const blob = await put(`runs/${nanoid(12)}.${ext}`, file, {
      access: "public",
      contentType: file.type || "image/jpeg",
    });

    // Build context
    const [recentRuns, weeklyKm] = await Promise.all([
      getRecentRunsForRunner(runnerId, 5),
      getWeeklyKm(runnerId),
    ]);

    // Encode image for Anthropic
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = normaliseMediaType(file.type || "image/jpeg");

    const message = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: buildUserPrompt(
                runner.name,
                recentRuns.map((r) => ({
                  distanceKm: r.distanceKm,
                  paceSecondsPerKm: r.paceSecondsPerKm,
                  createdAt: r.createdAt,
                })),
                Math.round(weeklyKm * 10) / 10,
              ),
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from model" }, { status: 502 });
    }

    let parsed: AnalyseResult;
    try {
      parsed = JSON.parse(stripJsonFences(textBlock.text)) as AnalyseResult;
    } catch {
      return NextResponse.json(
        { error: "Model returned invalid JSON", raw: textBlock.text },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...parsed,
      photoUrl: blob.url,
    });
  } catch (err) {
    console.error("[analyse-run] error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
