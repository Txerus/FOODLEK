"use client";

import { CalendarPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { chooseRecipeAction } from "@/server/actions/plan";

/** Puts this recipe on a chosen meal of the current week. */
export function AddToWeek({ planId, recipeId, slots }: { planId: string; recipeId: string; slots: { key: string; label: string }[] }) {
  const [slotKey, setSlotKey] = useState<string>("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={slotKey} onValueChange={setSlotKey}>
        <SelectTrigger className="w-60" aria-label="Repas à remplacer">
          <SelectValue placeholder="Choisir un repas de la semaine" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {slots.map((s) => (
              <SelectItem key={s.key} value={s.key}>
                {s.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        disabled={!slotKey || pending}
        onClick={() =>
          start(async () => {
            const res = await chooseRecipeAction({ planId, slotKey, recipeId });
            if (res.ok) {
              toast.success("Ajouté à la semaine.", { description: "Courses et budget recalculés." });
              router.push("/planning");
            } else toast.error(res.error);
          })
        }
      >
        {pending ? <Spinner data-icon="inline-start" /> : <CalendarPlusIcon data-icon="inline-start" />}
        Mettre au menu
      </Button>
    </div>
  );
}
