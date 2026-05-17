"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computePace, formatPace } from "@/lib/format";
import type { AnalyseResult, Runner } from "@/lib/types";

type Step = "pick" | "analysing" | "confirm";

type AnalyseResponse = AnalyseResult & { photoUrl: string };

export function SubmitRunDialog({ runners }: { runners: Runner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [runnerId, setRunnerId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AnalyseResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Editable form fields after analysis
  const [distanceKm, setDistanceKm] = useState("");
  const [timeMinutes, setTimeMinutes] = useState("");
  const [timeSeconds, setTimeSeconds] = useState("");
  const [reaction, setReaction] = useState("");
  const [note, setNote] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function reset() {
    setStep("pick");
    setRunnerId("");
    setFile(null);
    setResult(null);
    setDistanceKm("");
    setTimeMinutes("");
    setTimeSeconds("");
    setReaction("");
    setNote("");
    setSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function handleAnalyse() {
    if (!runnerId) {
      toast.error("Pick a runner first.");
      return;
    }
    if (!file) {
      toast.error("Upload a photo first.");
      return;
    }
    setStep("analysing");
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("runnerId", runnerId);
      const res = await fetch("/api/analyse-run", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Analyse failed (${res.status})`);
      }
      const data = (await res.json()) as AnalyseResponse;
      setResult(data);
      setDistanceKm(String(data.distanceKm ?? ""));
      const totalSec = Math.max(0, Math.round(data.durationSeconds ?? 0));
      setTimeMinutes(String(Math.floor(totalSec / 60)));
      setTimeSeconds(String(totalSec % 60));
      setReaction(data.reaction ?? "");
      setStep("confirm");
      if (data.confidence === "low") {
        toast.warning(
          "Couldn't read that clearly — check the numbers before you post.",
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
      setStep("pick");
    }
  }

  async function handleConfirm() {
    if (!result || !runnerId) return;
    const distance = Number(distanceKm);
    const mins = Number(timeMinutes || 0);
    const secs = Number(timeSeconds || 0);
    const duration = mins * 60 + secs;
    if (!Number.isFinite(distance) || distance <= 0) {
      toast.error("Distance has to be a positive number.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Time has to be more than zero.");
      return;
    }
    setSubmitting(true);
    try {
      const pace = computePace(distance, duration);
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runnerId,
          distanceKm: distance,
          durationSeconds: duration,
          paceSecondsPerKm: pace,
          sourceType: result.sourceType,
          confidence: result.confidence,
          reaction,
          photoUrl: result.photoUrl,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Save failed (${res.status})`);
      }
      toast.success("Posted. Yeah, righto.");
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totalDurationSeconds =
    (Number(timeMinutes) || 0) * 60 + (Number(timeSeconds) || 0);
  const pace =
    Number(distanceKm) > 0 && totalDurationSeconds > 0
      ? computePace(Number(distanceKm), totalDurationSeconds)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="lg" className="w-full" />}>
        Show us then
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "pick" && "Show us then"}
            {step === "analysing" && "Verifying proof of run…"}
            {step === "confirm" && "Stand by ya numbers"}
          </DialogTitle>
          <DialogDescription>
            {step === "pick" && "Pick a runner and upload your run evidence."}
            {step === "analysing" &&
              "The Proof of Run AI is having a squiz at your photo."}
            {step === "confirm" && "Go on then, prove it."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Runner</Label>
              <Select
                value={runnerId}
                onValueChange={(v) => setRunnerId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Who's running?">
                    {(value: string | null) => {
                      const r = runners.find((x) => x.id === value);
                      return r ? `${r.name} ${r.emoji}` : "Who's running?";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {runners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.emoji}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo evidence</Label>
              <Input
                id="photo"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="preview"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        )}

        {step === "analysing" && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              Verifying proof of run…
            </p>
          </div>
        )}

        {step === "confirm" && result && (
          <div className="space-y-4">
            {result.photoUrl && (
              <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
                <Image
                  src={result.photoUrl}
                  alt="run"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 400px"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="distance">Distance (km)</Label>
                <Input
                  id="distance"
                  inputMode="decimal"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Time</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="time-minutes"
                    inputMode="numeric"
                    aria-label="Minutes"
                    placeholder="min"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(e.target.value)}
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    id="time-seconds"
                    inputMode="numeric"
                    aria-label="Seconds"
                    placeholder="sec"
                    value={timeSeconds}
                    onChange={(e) => setTimeSeconds(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Pace:{" "}
              <span className="font-medium text-foreground">
                {formatPace(pace)}
              </span>
              {" · "}Source: {result.sourceType}
              {" · "}Confidence: {result.confidence}
            </div>
            <div className="space-y-1">
              <Label>Proof of Run AI reckons</Label>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {reaction}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="note">Right of reply (optional)</Label>
              <Input
                id="note"
                placeholder="Got something to say?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "pick" && (
            <Button onClick={handleAnalyse} disabled={!runnerId || !file}>
              Verify proof of run
            </Button>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={reset} disabled={submitting}>
                Start over
              </Button>
              <Button onClick={handleConfirm} disabled={submitting}>
                {submitting ? "Posting…" : "Post run"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
