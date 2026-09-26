"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { MEAL_TYPE_LABELS, type MealType } from "@/domain/catalog/types";
import { DAY_LABELS, DAY_SHORT, type HouseholdSetup } from "@/lib/validation/household";

const MEALS: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];

export function MealsStep() {
  const { control, setValue, formState } = useFormContext<HouseholdSetup>();
  const schedule = useWatch({ control, name: "schedule" });
  const count = MEALS.reduce((s, m) => s + schedule[m].length, 0);

  function toggle(meal: MealType, day: number, on: boolean) {
    const current = new Set(schedule[meal]);
    if (on) current.add(day);
    else current.delete(day);
    setValue(`schedule.${meal}`, [...current].sort(), { shouldDirty: true, shouldValidate: true });
  }

  function preset(meal: MealType, days: number[]) {
    setValue(`schedule.${meal}`, days, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => preset("dinner", ALL)}>
          Dîners tous les soirs
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => preset("lunch", WEEKDAYS)}>
          Déjeuners en semaine
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => preset("lunch", ALL)}>
          Tous les déjeuners
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => MEALS.forEach((m) => preset(m, []))}
        >
          Tout effacer
        </Button>
      </div>

      <div className="surface overflow-x-auto p-2 sm:p-4">
        <table className="w-full border-separate border-spacing-y-1 text-sm">
          <caption className="sr-only">Repas à planifier par jour</caption>
          <thead>
            <tr>
              <th scope="col" className="w-28 text-left font-medium text-muted-foreground">
                <span className="sr-only">Repas</span>
              </th>
              {DAY_SHORT.map((d, i) => (
                <th key={d} scope="col" className="px-0.5 text-center font-medium text-muted-foreground">
                  <abbr title={DAY_LABELS[i]} className="no-underline">
                    {d}
                  </abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MEALS.map((meal) => (
              <tr key={meal}>
                <th scope="row" className="pr-2 text-left font-medium">
                  {MEAL_TYPE_LABELS[meal]}
                </th>
                {ALL.map((day) => (
                  <td key={day} className="text-center">
                    <Checkbox
                      className="size-6 rounded-md"
                      checked={schedule[meal].includes(day)}
                      onCheckedChange={(v) => toggle(meal, day, v === true)}
                      aria-label={`${MEAL_TYPE_LABELS[meal]} du ${DAY_LABELS[day].toLowerCase()}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <strong className="text-foreground">{count} repas</strong> à planifier cette semaine
        {schedule.lunch.length || schedule.dinner.length
          ? ` (${schedule.dinner.length} dîner${schedule.dinner.length > 1 ? "s" : ""}, ${schedule.lunch.length} déjeuner${schedule.lunch.length > 1 ? "s" : ""})`
          : ""}
        .
      </p>
      {schedule.snack.length > 0 || schedule.breakfast.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Le catalogue compte pour l'instant peu de petits-déjeuners et aucune collation : ces repas pourront rester vides.
        </p>
      ) : null}
      <FieldError errors={[formState.errors.schedule as { message?: string } | undefined]} />
    </div>
  );
}
