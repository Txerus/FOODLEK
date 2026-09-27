"use client";

import { EllipsisVerticalIcon, PinIcon, PinOffIcon, ShuffleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { REPLACEMENT_LABELS, type ReplacementReason } from "@/domain/planning/optimizer";
import { formatEuros, formatMinutes } from "@/lib/format";
import { applyReplacementAction, previewReplacementAction, restoreMealAction, toggleLockAction } from "@/server/actions/plan";
import type { ReplacementProposal } from "@/server/services/plans";

/** The 11 reasons, grouped so the menu reads at a glance. */
const GROUPS: { label: string; reasons: ReplacementReason[] }[] = [
  { label: "Ce plat ne convient pas", reasons: ["dislike", "recently_eaten", "too_long", "too_expensive"] },
  { label: "Envie de…", reasons: ["want_chicken", "want_fish", "vegetarian", "lighter", "more_protein"] },
  { label: "Autre", reasons: ["use_pantry", "any"] },
];

const MENU_LABELS: Partial<Record<ReplacementReason, string>> = {
  any: "Autre chose, au hasard",
  want_chicken: "Du poulet",
  want_fish: "Du poisson",
  vegetarian: "Un plat végétarien",
  lighter: "Plus léger",
  more_protein: "Plus protéiné",
};

function deltaLabel(cents: number | null): string | null {
  if (cents === null) return null;
  if (Math.abs(cents) < 5) return "Courses de la semaine : prix inchangé";
  return cents < 0 ? `Courses de la semaine : ${formatEuros(-cents)} de moins` : `Courses de la semaine : ${formatEuros(cents)} de plus`;
}

export function MealActions({ planId, slotKey, locked, mealLabel }: { planId: string; slotKey: string; locked: boolean; mealLabel: string }) {
  const [pending, start] = useTransition();
  const [reason, setReason] = useState<ReplacementReason | null>(null);
  const [proposal, setProposal] = useState<ReplacementProposal | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const router = useRouter();

  function preview(r: ReplacementReason, exclude: string[] = []) {
    setReason(r);
    start(async () => {
      const res = await previewReplacementAction({ planId, slotKey, reason: r, exclude });
      if (!res.ok) {
        toast.error(res.error);
        setReason(null);
        return;
      }
      setProposal(res.data);
      if (res.data.recipeId) setSeen([...exclude, res.data.recipeId]);
    });
  }

  function close() {
    setReason(null);
    setProposal(null);
    setSeen([]);
  }

  function apply() {
    if (!reason || !proposal?.recipeId) return;
    const recipeId = proposal.recipeId;
    const title = proposal.recipeTitle;
    const r = reason;
    start(async () => {
      const res = await applyReplacementAction({ planId, slotKey, reason: r, recipeId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      close();
      router.refresh();
      const previous = res.data.previousRecipeId;
      toast.success(title ? `Remplacé par : ${title}` : "Repas remplacé.", {
        description: "Portions, courses et budget ont été recalculés.",
        duration: 10_000,
        action: {
          label: "Annuler",
          onClick: async () => {
            const undo = await restoreMealAction({ planId, slotKey, recipeId: previous });
            if (undo.ok) {
              toast.success(undo.message ?? "Repas rétabli.");
              router.refresh();
            } else toast.error(undo.error);
          },
        },
      });
    });
  }

  function toggleLock() {
    start(async () => {
      const res = await toggleLockAction({ planId, slotKey, locked: !locked });
      if (res.ok) {
        toast.success(locked ? "Repas désépinglé." : "Repas épinglé : il sera conservé si vous régénérez la semaine.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  const loadingPreview = pending && reason !== null && proposal === null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Modifier : ${mealLabel}`} disabled={pending}>
            {pending ? <Spinner /> : <EllipsisVerticalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={toggleLock}>
              {locked ? <PinOffIcon /> : <PinIcon />}
              {locked ? "Désépingler" : "Épingler ce repas"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {GROUPS.map((g) => (
            <div key={g.label}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {g.label === "Autre" ? <ShuffleIcon aria-hidden className="size-3.5" /> : null}
                {g.label}
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {g.reasons.map((r) => (
                  <DropdownMenuItem key={r} onSelect={() => preview(r)}>
                    {MENU_LABELS[r] ?? REPLACEMENT_LABELS[r]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reason !== null} onOpenChange={(open) => (open ? null : close())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remplacer : {mealLabel}</DialogTitle>
            <DialogDescription>{reason ? `Demande : ${(MENU_LABELS[reason] ?? REPLACEMENT_LABELS[reason]).toLowerCase()}.` : null}</DialogDescription>
          </DialogHeader>
          {loadingPreview ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Spinner /> Recherche d'une recette…
            </p>
          ) : proposal?.recipeId ? (
            <div className="flex flex-col gap-1.5 rounded-lg bg-muted/60 p-4" aria-live="polite">
              <p className="font-display text-lg font-semibold">{proposal.recipeTitle}</p>
              <p className="text-sm text-muted-foreground">
                {proposal.minutes !== null ? formatMinutes(proposal.minutes) : null}
                {deltaLabel(proposal.basketDeltaCents) ? ` · ${deltaLabel(proposal.basketDeltaCents)}` : null}
              </p>
              {proposal.message ? <p className="text-sm text-saffron-ink">{proposal.message}</p> : null}
            </div>
          ) : proposal ? (
            <p className="text-sm" aria-live="polite">
              {proposal.message}
            </p>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Garder le repas actuel
            </Button>
            {reason && proposal?.recipeId ? (
              <Button type="button" variant="outline" onClick={() => preview(reason, seen)} disabled={pending}>
                Autre proposition
              </Button>
            ) : null}
            {proposal?.recipeId ? (
              <Button type="button" onClick={apply} disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Remplacer
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
