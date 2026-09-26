"use client";

import { EllipsisVerticalIcon, PinIcon, PinOffIcon, ShuffleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { replaceMealAction, toggleLockAction } from "@/server/actions/plan";

const REASONS: ReplacementReason[] = [
  "any",
  "dislike",
  "too_expensive",
  "too_long",
  "recently_eaten",
  "use_pantry",
  "want_chicken",
  "want_fish",
  "vegetarian",
  "lighter",
  "more_protein",
];

export function MealActions({ planId, slotKey, locked, mealLabel }: { planId: string; slotKey: string; locked: boolean; mealLabel: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function replace(reason: ReplacementReason) {
    start(async () => {
      const res = await replaceMealAction({ planId, slotKey, reason });
      if (res.ok) {
        toast.success(res.message ?? "Repas remplacé.", { description: "Portions, courses et budget ont été recalculés." });
        router.refresh();
      } else toast.error(res.error);
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Modifier : ${mealLabel}`} disabled={pending}>
          {pending ? <Spinner /> : <EllipsisVerticalIcon />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={toggleLock}>
            {locked ? <PinOffIcon /> : <PinIcon />}
            {locked ? "Désépingler" : "Épingler ce repas"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <ShuffleIcon aria-hidden className="size-3.5" />
          Remplacer
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          {REASONS.map((r) => (
            <DropdownMenuItem key={r} onSelect={() => replace(r)}>
              {REPLACEMENT_LABELS[r]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
