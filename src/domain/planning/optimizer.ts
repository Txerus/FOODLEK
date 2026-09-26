import { createRng, pickIndex, type Rng } from "../common/rng";
import { checkRecipeDiet, recipeProteinFamilies } from "../catalog/diets";
import { totalMinutes, type Recipe } from "../catalog/types";
import { recipeNutritionPerServing } from "../recipes/nutrition";
import {
  createContext,
  eligibleRecipes,
  emptyAssignment,
  evaluate,
  type Candidate,
  type EvalContext,
} from "./evaluate";
import type { Assignment, PlanEvaluation, PlannerInput, PlanSlot } from "./types";

/**
 * Weekly menu optimisation.
 *
 * The search space (a recipe per slot, with leftovers) is combinatorial and the
 * objective is non-linear: pack sizes create step costs, portions come from a
 * per-person least-squares problem, variety depends on sequences. A MIP solver
 * would need heavy linearisation for little gain at this size (≈12 slots,
 * tens of recipes). We use a deterministic greedy construction followed by
 * simulated annealing over three moves: change a slot, swap two slots, turn a
 * lunch into the leftovers of the previous dinner. See docs/ALGORITHMS.md.
 */

export interface OptimizationResult {
  best: PlanEvaluation;
  evaluations: number;
  /** Slots without any compatible recipe. */
  unfillable: PlanSlot[];
  candidates: Record<string, Candidate[]>;
}

function candidatesBySlot(input: PlannerInput): Record<string, Candidate[]> {
  const out: Record<string, Candidate[]> = {};
  for (const slot of input.slots) out[slot.key] = eligibleRecipes(input, slot);
  return out;
}

function previousDinnerKey(ctx: EvalContext, slot: PlanSlot): string | null {
  if (slot.mealType !== "lunch") return null;
  const prev = ctx.orderedSlots.find((s) => s.mealType === "dinner" && s.dayIndex === slot.dayIndex - 1);
  return prev?.key ?? null;
}

function greedyConstruct(
  input: PlannerInput,
  ctx: EvalContext,
  candidates: Record<string, Candidate[]>,
): { assignment: Assignment; evaluations: number } {
  const assignment = emptyAssignment(input);
  let evaluations = 0;
  for (const slot of ctx.orderedSlots) {
    if (assignment[slot.key]) continue;
    const options = candidates[slot.key];
    let bestId: string | null = null;
    let bestScore = Infinity;
    for (const c of options) {
      assignment[slot.key] = c.recipe.id;
      const score = evaluate(input, ctx, assignment).score.total;
      evaluations++;
      if (score < bestScore - 1e-12) {
        bestScore = score;
        bestId = c.recipe.id;
      }
    }
    assignment[slot.key] = bestId;
  }
  return { assignment, evaluations };
}

function proposeMove(
  rng: Rng,
  input: PlannerInput,
  ctx: EvalContext,
  candidates: Record<string, Candidate[]>,
  current: Assignment,
): Assignment | null {
  const free = ctx.orderedSlots.filter((s) => !input.locked[s.key] && candidates[s.key].length > 0);
  if (free.length === 0) return null;
  const next: Assignment = { ...current };
  const r = rng();
  if (r < 0.6) {
    const slot = free[pickIndex(rng, free.length)];
    const options = candidates[slot.key];
    next[slot.key] = options[pickIndex(rng, options.length)].recipe.id;
  } else if (r < 0.85 && free.length >= 2) {
    const a = free[pickIndex(rng, free.length)];
    const b = free[pickIndex(rng, free.length)];
    const ra = current[a.key];
    const rb = current[b.key];
    if (a.key === b.key || !ra || !rb) return null;
    const okA = candidates[a.key].some((c) => c.recipe.id === rb);
    const okB = candidates[b.key].some((c) => c.recipe.id === ra);
    if (!okA || !okB) return null;
    next[a.key] = rb;
    next[b.key] = ra;
  } else {
    if (!input.preferences.useLeftovers) return null;
    const lunches = free.filter((s) => s.mealType === "lunch");
    if (lunches.length === 0) return null;
    const slot = lunches[pickIndex(rng, lunches.length)];
    const prevKey = previousDinnerKey(ctx, slot);
    const prevRecipe = prevKey ? current[prevKey] : null;
    if (!prevRecipe) return null;
    if (!candidates[slot.key].some((c) => c.recipe.id === prevRecipe)) return null;
    next[slot.key] = prevRecipe;
  }
  return next;
}

export function optimizePlan(input: PlannerInput): OptimizationResult {
  const ctx = createContext(input);
  const candidates = candidatesBySlot(input);
  const unfillable = input.slots.filter((s) => !input.locked[s.key] && candidates[s.key].length === 0);

  const constructed = greedyConstruct(input, ctx, candidates);
  let evaluations = constructed.evaluations;
  let current = evaluate(input, ctx, constructed.assignment);
  evaluations++;
  let best = current;

  const rng = createRng(input.seed);
  const startTemperature = 0.05;
  for (let i = 0; i < input.iterations; i++) {
    const proposal = proposeMove(rng, input, ctx, candidates, current.assignment);
    if (!proposal) continue;
    const next = evaluate(input, ctx, proposal);
    evaluations++;
    const delta = next.score.total - current.score.total;
    const temperature = startTemperature * (1 - i / input.iterations) + 1e-6;
    if (delta < 0 || rng() < Math.exp(-delta / temperature)) {
      current = next;
      if (current.score.total < best.score.total - 1e-12) best = current;
    }
  }

  return { best, evaluations, unfillable, candidates };
}

export const REPLACEMENT_REASONS = [
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
  "cheaper",
] as const;
export type ReplacementReason = (typeof REPLACEMENT_REASONS)[number];

export const REPLACEMENT_LABELS: Record<ReplacementReason, string> = {
  any: "Remplacer cette recette",
  dislike: "Je n'aime pas",
  too_expensive: "Trop cher",
  too_long: "Trop long",
  recently_eaten: "Je l'ai mangée récemment",
  use_pantry: "Utiliser ce que j'ai",
  want_chicken: "Je veux du poulet",
  want_fish: "Je veux du poisson",
  vegetarian: "Repas végétarien",
  lighter: "Moins calorique",
  more_protein: "Plus protéiné",
  cheaper: "Plus économique",
};

function filterForReason(
  reason: ReplacementReason,
  current: Recipe,
  options: Candidate[],
  input: PlannerInput,
): Candidate[] {
  const others = options.filter((c) => c.recipe.id !== current.id);
  const perServing = (r: Recipe) => recipeNutritionPerServing(r, input.ingredients).nutrients;
  switch (reason) {
    case "too_long":
      return others.filter((c) => totalMinutes(c.recipe) < totalMinutes(current));
    case "want_chicken":
      return others.filter((c) => recipeProteinFamilies(c.recipe, input.ingredients).includes("poultry"));
    case "want_fish":
      return others.filter((c) => {
        const f = recipeProteinFamilies(c.recipe, input.ingredients);
        return f.includes("fish") || f.includes("seafood");
      });
    case "vegetarian":
      return others.filter((c) => checkRecipeDiet(c.recipe, input.ingredients, "vegetarian").compatible);
    case "lighter": {
      const ref = perServing(current).energyKcal;
      return others.filter((c) => perServing(c.recipe).energyKcal < ref * 0.95);
    }
    case "more_protein": {
      const ref = perServing(current).proteinG;
      return others.filter((c) => perServing(c.recipe).proteinG > ref * 1.05);
    }
    case "use_pantry": {
      const pantryIds = new Set(input.pantry.map((p) => p.ingredientId));
      return others.filter((c) => c.recipe.ingredients.some((ri) => pantryIds.has(ri.ingredientId) && ri.role !== "aromatic"));
    }
    default:
      return others;
  }
}

export interface ReplacementResult {
  evaluation: PlanEvaluation | null;
  /** Why no replacement was possible, in plain French. */
  message: string | null;
}

/**
 * Replace the recipe of one slot, keeping the rest of the week as it is. Every
 * derived figure (portions, shopping list, packs, budget, waste) is recomputed.
 */
export function replaceSlot(
  input: PlannerInput,
  assignment: Assignment,
  slotKey: string,
  reason: ReplacementReason,
): ReplacementResult {
  const ctx = createContext(input);
  const slot = ctx.slotsByKey.get(slotKey);
  const currentId = assignment[slotKey];
  if (!slot) return { evaluation: null, message: "Ce repas n'existe pas dans le planning." };
  const current = currentId ? ctx.recipesById.get(currentId) : undefined;
  const options = eligibleRecipes(input, slot);
  const filtered = current ? filterForReason(reason, current, options, input) : options;
  if (filtered.length === 0) {
    return { evaluation: null, message: "Aucune recette compatible ne répond à cette demande pour ce repas." };
  }

  const costFocused = reason === "too_expensive" || reason === "cheaper";
  let best: PlanEvaluation | null = null;
  let bestScore = Infinity;
  for (const c of filtered) {
    const next: Assignment = { ...assignment, [slotKey]: c.recipe.id };
    const ev = evaluate(input, ctx, next);
    const score = costFocused ? ev.shopping.totalCents * 1000 + ev.score.total : ev.score.total;
    if (score < bestScore) {
      bestScore = score;
      best = ev;
    }
  }
  if (costFocused && best && current) {
    const before = evaluate(input, ctx, assignment);
    if (best.shopping.totalCents >= before.shopping.totalCents) {
      return { evaluation: best, message: "Aucune alternative ne réduit le panier ; voici la moins chère des autres recettes." };
    }
  }
  return { evaluation: best, message: null };
}

/** Recomputes every derived figure for a given assignment (after a manual change). */
export function evaluateAssignment(input: PlannerInput, assignment: Assignment): PlanEvaluation {
  const ctx = createContext(input);
  return evaluate(input, ctx, assignment);
}
