import { formatEuros } from "../common/money";
import { MEAL_TYPE_LABELS, type Ingredient, type IngredientIndex, type Recipe } from "../catalog/types";
import { selectPacks } from "../shopping/packaging";
import type { OfferIndex, RetailPreferences } from "../retail/types";
import { formatIngredientAmount } from "../catalog/format";
import type { PlanEvaluation, PlanSlot } from "./types";

/**
 * Plain-language explanations of the optimiser's decisions. Every sentence is
 * built from computed figures; nothing here is generated free-form.
 */

export type ExplanationKind = "shared_pack" | "usage" | "leftovers" | "portions" | "budget" | "missing_prices" | "pantry";

export interface Explanation {
  kind: ExplanationKind;
  text: string;
}

const DAY_NAMES = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function slotLabel(slot: PlanSlot): string {
  const day = DAY_NAMES[new Date(`${slot.date}T12:00:00Z`).getUTCDay()];
  return `${MEAL_TYPE_LABELS[slot.mealType].toLowerCase()} de ${day}`;
}

function formatAmount(q: number, ingredient: Ingredient): string {
  return formatIngredientAmount(Math.round(q), ingredient.purchaseUnit, ingredient);
}

/** Minimum avoided leftover worth mentioning, per purchase unit. */
const MEANINGFUL_LEFTOVER = { g: 50, ml: 50, piece: 1 } as const;

function sharedPackExplanations(
  ev: PlanEvaluation,
  ingredients: IngredientIndex,
  offers: OfferIndex,
  prefs: RetailPreferences,
): { text: string; savings: number }[] {
  const out: { text: string; savings: number }[] = [];
  for (const line of ev.shopping.lines) {
    if (line.isStaple || line.toBuy <= 0 || line.costCents === null || line.choices.length === 0) continue;
    const recipes = new Map<string, { title: string; quantity: number }>();
    for (const u of line.usedIn) {
      const existing = recipes.get(u.recipeId);
      recipes.set(u.recipeId, { title: u.recipeTitle, quantity: (existing?.quantity ?? 0) + u.quantity });
    }
    if (recipes.size < 2) continue;
    const ingredient = ingredients.get(line.ingredientId);
    if (!ingredient) continue;
    let separateCost = 0;
    let separateLeftover = 0;
    let comparable = true;
    for (const r of recipes.values()) {
      const sel = selectPacks(Math.ceil(r.quantity), ingredient, offers.get(ingredient.id) ?? [], prefs);
      if (!sel) {
        comparable = false;
        break;
      }
      separateCost += sel.costCents;
      separateLeftover += sel.leftover;
    }
    if (!comparable) continue;
    const savings = separateCost - line.costCents;
    const avoided = separateLeftover - line.leftover;
    if (savings <= 0 && avoided <= 0) continue;
    const single = line.choices.length === 1 && line.choices[0].count === 1;
    const pack = single ? `un seul ${line.choices[0].offer.packLabel}` : "les mêmes paquets";
    const name = ingredient.name.toLowerCase();
    const parts: string[] = [];
    if (savings > 0) parts.push(`${formatEuros(savings)} de moins que si chaque recette avait ses propres paquets`);
    if (avoided >= MEANINGFUL_LEFTOVER[ingredient.purchaseUnit]) {
      parts.push(`environ ${formatAmount(avoided, ingredient)} de reste en moins`);
    }
    if (parts.length === 0) continue;
    out.push({
      text: `${recipes.size} recettes se partagent ${pack} (${name}) : ${parts.join(", ")}.`,
      savings,
    });
  }
  return out.sort((a, b) => b.savings - a.savings);
}

export function explainPlan(
  ev: PlanEvaluation,
  slots: readonly PlanSlot[],
  recipes: ReadonlyMap<string, Recipe>,
  ingredients: IngredientIndex,
  offers: OfferIndex,
  prefs: RetailPreferences,
): Explanation[] {
  const explanations: Explanation[] = [];
  const slotByKey = new Map(slots.map((s) => [s.key, s]));

  const b = ev.budget;
  if (b.basketCents > 0) {
    const partial = b.partial ? " (hors articles sans prix)" : "";
    explanations.push({
      kind: "budget",
      text:
        b.marginCents >= 0
          ? `Panier de ${formatEuros(b.basketCents)}${partial} pour un budget de ${formatEuros(b.budgetCents)} : il reste ${formatEuros(b.marginCents)}.`
          : `Panier de ${formatEuros(b.basketCents)}${partial} : ${formatEuros(-b.marginCents)} au-dessus du budget de ${formatEuros(b.budgetCents)}.`,
    });
  }

  for (const s of sharedPackExplanations(ev, ingredients, offers, prefs).slice(0, 3)) {
    explanations.push({ kind: "shared_pack", text: s.text });
  }

  if (ev.shopping.usageRatio !== null) {
    explanations.push({
      kind: "usage",
      text: `Ce menu utilise ${Math.round(ev.shopping.usageRatio * 100)} % des produits frais achetés.`,
    });
  }

  for (const session of ev.sessions) {
    if (session.servesSlotKeys.length < 2) continue;
    const recipe = recipes.get(session.recipeId);
    const first = slotByKey.get(session.servesSlotKeys[0]);
    const second = slotByKey.get(session.servesSlotKeys[1]);
    if (!recipe || !first || !second) continue;
    explanations.push({
      kind: "leftovers",
      text: `${recipe.title} : cuisiné une fois au ${slotLabel(first)}, les restes servent au ${slotLabel(second)}. Une session de cuisine en moins.`,
    });
  }

  // First meal where two people get visibly different plates.
  for (const [slotKey, portions] of Object.entries(ev.portions)) {
    if (portions.length < 2) continue;
    const [a, bb] = portions;
    const proteinA = a.items.find((i) => i.role === "protein");
    const proteinB = bb.items.find((i) => i.role === "protein");
    const starchA = a.items.find((i) => i.role === "starch");
    const starchB = bb.items.find((i) => i.role === "starch");
    if (!proteinA || !proteinB || proteinA.grams === proteinB.grams) continue;
    const recipe = recipes.get(ev.assignment[slotKey] ?? "");
    const plate = (protein: typeof proteinA, starch: typeof starchA) => {
      const pIng = ingredients.get(protein.ingredientId);
      const sIng = starch ? ingredients.get(starch.ingredientId) : undefined;
      const main = pIng ? formatIngredientAmount(protein.quantity, protein.unit, pIng) : protein.ingredientName;
      return sIng && starch ? `${main} et ${formatIngredientAmount(starch.quantity, starch.unit, sIng)}` : main;
    };
    explanations.push({
      kind: "portions",
      text: `${recipe?.title ?? "Même plat"} : ${a.name} a ${plate(proteinA, starchA)}, ${bb.name} ${plate(proteinB, starchB)}. Un seul plat, des portions adaptées à chacun.`,
    });
    break;
  }

  const pantryLines = ev.shopping.lines.filter((l) => l.fromPantry > 0);
  if (pantryLines.length > 0) {
    const names = pantryLines.slice(0, 5).map((l) => l.ingredientName.toLowerCase());
    explanations.push({
      kind: "pantry",
      text: `Déjà dans votre placard, retiré du panier : ${names.join(", ")}${pantryLines.length > 5 ? ` et ${pantryLines.length - 5} autre${pantryLines.length > 6 ? "s" : ""}` : ""}.`,
    });
  }

  if (ev.shopping.missingPriceCount > 0) {
    explanations.push({
      kind: "missing_prices",
      text: `${ev.shopping.missingPriceCount} article${ev.shopping.missingPriceCount > 1 ? "s n'ont" : " n'a"} pas de prix disponible dans ce magasin : le total est incomplet.`,
    });
  }

  return explanations;
}
