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
  const [durationSeconds, setDurationSeconds] = useState("");
  const [reaction, setReaction] = useState("");
  const [note, setNote] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
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
    setDurationSeconds("");
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
      const res = await fetch("/api/analyse-run", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Analyse failed (${res.status})`);
      }
      const data = (await res.json()) as AnalyseResponse;
      setResult(data);
      setDistanceKm(String(data.distanceKm ?? ""));
      setDurationSeconds(String(data.durationSeconds ?? ""));
      setReaction(data.reaction ?? "");
      setStep("confirm");
      if (data.confidence === "low") {
        toast.warning("Couldn't read that clearly — check the numbers before you post.");
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
    const duration = Number(durationSeconds);
    if (!Number.isFinite(distance) || distance <= 0) {
      toast.error("Distance has to be a positive number.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      toast.error("Duration has to be a positive number of seconds.");
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

  const pace =
    Number(distanceKm) > 0 && Number(durationSeconds) > 0
      ? computePace(Number(distanceKm), Number(durationSeconds))
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
            {step === "analysing" && "Show us then..."}
            {step === "confirm" && "Reckon this looks right?"}
          </DialogTitle>
          <DialogDescription>
            {step === "pick" && "Pick a runner and upload your run evidence."}
            {step === "analysing" && "Claude's having a squiz at the photo."}
            {step === "confirm" && "Tweak anything that's off, then post it."}
          </DialogDescription>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Runner</Label>
              <Select value={runnerId} onValueChange={(v) => setRunnerId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Who's running?" />
                </SelectTrigger>
                <SelectContent>
                  {runners.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.emoji} {r.name}
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
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="preview" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        )}

        {step === "analysing" && (
          <div className="py-8 flex flex-col items-center gap-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
            <p className="text-sm text-muted-foreground">Reading the numbers off your photo…</p>
          </div>
        )}

        {step === "confirm" && result && (
          <div className="space-y-4">
            {result.photoUrl && (
              <div className="relative w-full aspect-square rounded-md overflow-hidden border bg-muted">
                <Image src={result.photoUrl} alt="run" fill className="object-contain" sizes="(max-width: 768px) 100vw, 400px" />
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
                <Label htmlFor="duration">Duration (sec)</Label>
                <Input
                  id="duration"
                  inputMode="numeric"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Pace: <span className="font-medium text-foreground">{formatPace(pace)}</span>
              {" · "}Source: {result.sourceType}
              {" · "}Confidence: {result.confidence}
            </div>
            <div className="space-y-1">
              <Label htmlFor="reaction">Claude reckons</Label>
              <textarea
                id="reaction"
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={reaction}
                onChange={(e) => setReaction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="note">Note (optional)</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "pick" && (
            <Button onClick={handleAnalyse} disabled={!runnerId || !file}>
              Analyse photo
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
