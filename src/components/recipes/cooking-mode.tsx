"use client";

import { ArrowLeftIcon, ArrowRightIcon, ListIcon, PauseIcon, PlayIcon, RotateCcwIcon, SunIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface CookingStep {
  order: number;
  text: string;
  timerSeconds: number | null;
}

export interface CookingIngredient {
  name: string;
  amount: string;
  note: string | null;
}

function formatClock(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function beep() {
  try {
    const AudioCtx = window.AudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // Audio can be unavailable (autoplay policy); the visual alert remains.
  }
}

const noopSubscribe = () => () => undefined;

function useWakeLock() {
  const supported = useSyncExternalStore(noopSubscribe, () => "wakeLock" in navigator, () => false);
  const [active, setActive] = useState(false);
  const sentinel = useRef<WakeLockSentinel | null>(null);

  const request = useCallback(async () => {
    try {
      sentinel.current = await navigator.wakeLock.request("screen");
      setActive(true);
      sentinel.current.addEventListener("release", () => setActive(false));
    } catch {
      setActive(false);
      toast.error("L'écran ne peut pas rester allumé sur cet appareil.");
    }
  }, []);

  const release = useCallback(async () => {
    await sentinel.current?.release();
    sentinel.current = null;
    setActive(false);
  }, []);

  // The lock is released when the tab is hidden; re-acquire it on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && sentinel.current === null && active) void request();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active, request]);

  useEffect(() => () => void sentinel.current?.release(), []);

  return { supported, active, request, release };
}

/** Remounted for each step (parent is keyed), so it always starts from the step's duration. */
function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setRunning(false);
          beep();
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          toast.success("Minuteur terminé");
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft">
      <span
        className={cn("font-display text-3xl font-semibold tabular", remaining === 0 && "text-paprika")}
        role="timer"
        aria-live={running ? "off" : "polite"}
        aria-label={`Minuteur : ${formatClock(remaining)}`}
      >
        {formatClock(remaining)}
      </span>
      <div className="ml-auto flex gap-2">
        {running ? (
          <Button type="button" variant="outline" onClick={() => setRunning(false)}>
            <PauseIcon data-icon="inline-start" /> Pause
          </Button>
        ) : (
          <Button type="button" onClick={() => setRunning(true)} disabled={remaining === 0}>
            <PlayIcon data-icon="inline-start" /> {remaining === seconds ? "Démarrer le minuteur" : "Reprendre"}
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Réinitialiser le minuteur"
          onClick={() => {
            setRunning(false);
            setRemaining(seconds);
          }}
        >
          <RotateCcwIcon />
        </Button>
      </div>
    </div>
  );
}

export function CookingMode({
  title,
  steps,
  ingredients,
  exitHref,
}: {
  title: string;
  steps: CookingStep[];
  ingredients: CookingIngredient[];
  exitHref: string;
}) {
  const [index, setIndex] = useState(0);
  const wake = useWakeLock();
  const headingRef = useRef<HTMLParagraphElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta)));
      requestAnimationFrame(() => headingRef.current?.focus());
    },
    [steps.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, [role=dialog]")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Quitter le mode cuisine">
          <Link href={exitHref}>
            <XIcon />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base font-medium" title={title}>
          {title}
        </h1>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <ListIcon data-icon="inline-start" /> Ingrédients
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Ingrédients</SheetTitle>
              <SheetDescription>Quantités totales à cuisiner pour ce repas.</SheetDescription>
            </SheetHeader>
            <ul className="flex flex-col divide-y px-4 pb-6">
              {ingredients.map((i) => (
                <li key={i.name} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span>
                    {i.name}
                    {i.note ? <span className="block text-xs text-muted-foreground">{i.note}</span> : null}
                  </span>
                  <span className="font-semibold tabular whitespace-nowrap">{i.amount}</span>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
      </header>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Étape {index + 1}/{steps.length}
          </span>
          {wake.supported ? (
            <label className="inline-flex items-center gap-2">
              <SunIcon aria-hidden className="size-4" />
              Écran toujours actif
              <Switch checked={wake.active} onCheckedChange={(v) => (v ? void wake.request() : void wake.release())} />
            </label>
          ) : null}
        </div>
        {/* One dot per step: jump straight to any step (useful to re-read one). */}
        <ol className="flex gap-1.5" aria-label="Étapes de la recette">
          {steps.map((_, i) => (
            <li key={i} className="flex-1">
              <button
                type="button"
                onClick={() => go(i - index)}
                aria-label={`Aller à l'étape ${i + 1}`}
                aria-current={i === index ? "step" : undefined}
                className="group block w-full py-2"
              >
                <span
                  className={`block h-2 w-full rounded-full transition-colors group-hover:bg-primary/80 ${i < index ? "bg-primary/60" : i === index ? "bg-primary" : "bg-muted"}`}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>

      <section key={index} className="flex flex-1 animate-rise flex-col justify-center gap-8 py-10" aria-live="polite">
        <p ref={headingRef} tabIndex={-1} className="font-display text-2xl leading-snug font-medium text-pretty outline-none sm:text-4xl">
          {step.text}
        </p>
        {step.timerSeconds ? <StepTimer seconds={step.timerSeconds} /> : null}
      </section>

      <nav aria-label="Étapes" className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" size="lg" className="h-14 text-base" onClick={() => go(-1)} disabled={index === 0}>
          <ArrowLeftIcon data-icon="inline-start" /> Précédent
        </Button>
        {last ? (
          <Button asChild size="lg" className="h-14 text-base">
            <Link href={exitHref}>Terminé, bon appétit</Link>
          </Button>
        ) : (
          <Button type="button" size="lg" className="h-14 text-base" onClick={() => go(1)}>
            Suivant <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
      </nav>
    </div>
  );
}
