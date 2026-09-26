"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { BudgetSummary } from "@/domain/budget/budget";
import { formatEuros } from "@/lib/format";
import { acceptOverBudgetAction } from "@/server/actions/plan";

/** Strict budget: an overflow must be explicitly accepted by the user. */
export function OverBudgetNotice({ planId, budget, accepted }: { planId: string; budget: BudgetSummary; accepted: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (budget.marginCents >= 0) return null;
  const overflow = formatEuros(-budget.marginCents);
  if (budget.mode !== "strict") {
    return budget.status === "over" ? (
      <Alert>
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Panier au-dessus du budget de {overflow}</AlertTitle>
        <AlertDescription>Utilisez « Trop cher » sur un repas pour réduire le panier.</AlertDescription>
      </Alert>
    ) : null;
  }
  if (accepted) {
    return <p className="text-sm text-muted-foreground">Dépassement de {overflow} validé pour cette semaine.</p>;
  }
  return (
    <Alert variant="destructive">
      <TriangleAlertIcon aria-hidden />
      <AlertTitle>Budget strict dépassé de {overflow}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>Aucune combinaison de recettes compatible ne tient dans le budget avec les prix actuels. Vous pouvez accepter ce dépassement ou remplacer des repas.</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await acceptOverBudgetAction({ planId });
                if (res.ok) {
                  toast.success(res.message ?? "Validé.");
                  router.refresh();
                } else toast.error(res.error);
              })
            }
          >
            Accepter le dépassement
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
