import type { DataQuality } from "../common/data-quality";
import type { Cents } from "../common/money";

export const BUDGET_MODES = ["strict", "target", "nutrition_first"] as const;
export type BudgetMode = (typeof BUDGET_MODES)[number];

export const BUDGET_MODE_LABELS: Record<BudgetMode, { label: string; hint: string }> = {
  strict: { label: "Budget strict", hint: "Ne jamais dépasser, sauf si vous le validez." },
  target: { label: "Budget cible", hint: "Quelques pourcents de plus si le menu y gagne vraiment." },
  nutrition_first: { label: "Nutrition prioritaire", hint: "Le budget devient secondaire." },
};

export interface BudgetConfig {
  /** Tolerance above budget in "target" mode. */
  targetTolerance: number;
}

export const DEFAULT_BUDGET_CONFIG: BudgetConfig = { targetTolerance: 0.05 };

export type BudgetStatus = "under" | "within_tolerance" | "over";

export interface BudgetSummary {
  budgetCents: Cents;
  basketCents: Cents;
  /** Positive when under budget. */
  marginCents: Cents;
  status: BudgetStatus;
  mode: BudgetMode;
  /** Only in strict mode: the basket exceeds the budget and needs an explicit validation. */
  requiresValidation: boolean;
  perPersonPerMealCents: Cents | null;
  perMealCents: Cents | null;
  perDayCents: Cents | null;
  /** True when some items have no price: the basket total is a lower bound. */
  partial: boolean;
  quality: DataQuality;
}

export interface BudgetInput {
  budgetCents: Cents;
  mode: BudgetMode;
  basketCents: Cents;
  /** Number of planned meals (slots). */
  mealCount: number;
  /** Sum over meals of the number of people eating. */
  personMealCount: number;
  dayCount: number;
  missingPriceCount: number;
  quality: DataQuality;
}

export function budgetLimitCents(budgetCents: Cents, mode: BudgetMode, config: BudgetConfig = DEFAULT_BUDGET_CONFIG): Cents {
  if (mode === "strict") return budgetCents;
  if (mode === "target") return Math.round(budgetCents * (1 + config.targetTolerance));
  return Number.POSITIVE_INFINITY;
}

export function summarizeBudget(input: BudgetInput, config: BudgetConfig = DEFAULT_BUDGET_CONFIG): BudgetSummary {
  const margin = input.budgetCents - input.basketCents;
  let status: BudgetStatus = "under";
  if (margin < 0) {
    status = input.basketCents <= Math.round(input.budgetCents * (1 + config.targetTolerance)) ? "within_tolerance" : "over";
  }
  const div = (n: number) => (n > 0 ? Math.round(input.basketCents / n) : null);
  return {
    budgetCents: input.budgetCents,
    basketCents: input.basketCents,
    marginCents: margin,
    status,
    mode: input.mode,
    requiresValidation: input.mode === "strict" && margin < 0,
    perPersonPerMealCents: div(input.personMealCount),
    perMealCents: div(input.mealCount),
    perDayCents: div(input.dayCount),
    partial: input.missingPriceCount > 0,
    quality: input.quality,
  };
}
