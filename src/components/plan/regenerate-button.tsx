"use client";

import { RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { regeneratePlanAction } from "@/server/actions/plan";

export function RegenerateButton({ label = "Régénérer la semaine", variant = "outline" }: { label?: string; variant?: "outline" | "default" }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      type="button"
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await regeneratePlanAction();
          if (res.ok) {
            toast.success(res.message ?? "Semaine régénérée.");
            router.refresh();
          } else toast.error(res.error);
        })
      }
    >
      {pending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
      {pending ? "Calcul en cours…" : label}
    </Button>
  );
}
