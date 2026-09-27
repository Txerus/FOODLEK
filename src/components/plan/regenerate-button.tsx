"use client";

import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { regeneratePlanAction, undoRegenerationAction } from "@/server/actions/plan";

/**
 * Regenerates the week. With an existing week (`pinnedCount` given), asks
 * first and offers to undo afterwards: one click must not lose a menu.
 */
export function RegenerateButton({
  label = "Régénérer la semaine",
  variant = "outline",
  pinnedCount,
}: {
  label?: string;
  variant?: "outline" | "default";
  /** Number of pinned meals of the current week; omit when there is no week yet. */
  pinnedCount?: number;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function run() {
    setOpen(false);
    start(async () => {
      const res = await regeneratePlanAction();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
      const planId = res.data.planId;
      toast.success(res.message ?? "Semaine régénérée.", {
        duration: 10_000,
        action:
          pinnedCount !== undefined
            ? {
                label: "Annuler",
                onClick: async () => {
                  const undo = await undoRegenerationAction({ planId });
                  if (undo.ok) {
                    toast.success(undo.message ?? "Semaine rétablie.");
                    router.refresh();
                  } else toast.error(undo.error);
                },
              }
            : undefined,
      });
    });
  }

  const button = (
    <Button type="button" variant={variant} disabled={pending} onClick={() => (pinnedCount === undefined ? run() : setOpen(true))}>
      {pending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
      {pending ? "Calcul en cours…" : label}
    </Button>
  );
  if (pinnedCount === undefined) return button;

  return (
    <>
      {button}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer toute la semaine ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pinnedCount > 0
                ? `Les ${pinnedCount} repas épinglé(s) sont conservés ; tous les autres sont recalculés, et les cases cochées de la liste de courses sont remises à zéro.`
                : "Tous les repas sont recalculés et les cases cochées de la liste de courses sont remises à zéro. Épinglez d'abord les repas à garder."}{" "}
              Vous pourrez annuler juste après.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Garder cette semaine</AlertDialogCancel>
            <AlertDialogAction onClick={run}>Régénérer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
