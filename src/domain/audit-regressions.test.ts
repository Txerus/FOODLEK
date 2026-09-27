import { describe, expect, it } from "vitest";
import { RECIPES } from "@/data/recipes";
import { demoInput } from "@/test/fixtures";
import { partitive } from "./catalog/format";
import { checkRecipeForEaters } from "./catalog/diets";
import { freshnessOf } from "./common/data-quality";
import { buildSessions, createContext } from "./planning/evaluate";
import { optimizePlan } from "./planning/optimizer";
import { formatQuantity } from "./units/units";

/** Regressions for the review of 27/09/2026. */

describe("leftovers across a breakfast", () => {
  it("merges Monday dinner and Tuesday lunch even with a breakfast in between", () => {
    const base = demoInput();
    const recipe = RECIPES.find((r) => r.keepsWell && r.mealTypes.includes("dinner") && r.mealTypes.includes("lunch"))!;
    const breakfast = RECIPES.find((r) => r.mealTypes.includes("breakfast"))!;
    const slots = [
      { key: "d0:dinner", date: "2026-09-28", dayIndex: 0, mealType: "dinner" as const, eaterIds: base.slots[0].eaterIds },
      { key: "d1:breakfast", date: "2026-09-29", dayIndex: 1, mealType: "breakfast" as const, eaterIds: base.slots[0].eaterIds },
      { key: "d1:lunch", date: "2026-09-29", dayIndex: 1, mealType: "lunch" as const, eaterIds: base.slots[0].eaterIds },
    ];
    const input = { ...base, slots, locked: {}, preferences: { ...base.preferences, useLeftovers: true } };
    const ctx = createContext(input);
    const sessions = buildSessions(input, ctx, { "d0:dinner": recipe.id, "d1:breakfast": breakfast.id, "d1:lunch": recipe.id });
    expect(sessions.find((s) => s.slotKey === "d0:dinner")?.servesSlotKeys).toEqual(["d0:dinner", "d1:lunch"]);
    expect(sessions).toHaveLength(2);
    const noBreakfast = buildSessions(input, ctx, { "d0:dinner": recipe.id, "d1:breakfast": null, "d1:lunch": recipe.id });
    expect(noBreakfast).toHaveLength(1);
  });
});

describe("pinned meals", () => {
  it("never keeps a pinned recipe that breaks a member's diet", () => {
    const base = demoInput();
    const pork = RECIPES.find((r) => r.ingredients.some((i) => i.ingredientId === "ing_filet-mignon-porc"))!;
    const slot = base.slots.find((s) => pork.mealTypes.includes(s.mealType))!;
    const members = base.members.map((m) => ({ ...m, constraints: { ...m.constraints, diets: [...m.constraints.diets, "no_pork" as const] } }));
    const result = optimizePlan({ ...base, members, locked: { [slot.key]: pork.id }, iterations: 50 });
    expect(result.best.assignment[slot.key]).not.toBe(pork.id);
    expect(result.droppedLocks.map((d) => d.slotKey)).toEqual([slot.key]);
  });
});

describe("safety checks", () => {
  it("refuses a recipe with an unknown ingredient for someone with an allergy", () => {
    const recipe = { ...RECIPES[0], ingredients: [...RECIPES[0].ingredients, { ...RECIPES[0].ingredients[0], ingredientId: "ing_ghost" }] };
    const check = checkRecipeForEaters(recipe, demoInput().ingredients, [{ name: "A", constraints: { diets: [], allergies: ["peanuts"], excludedIngredientIds: [] } }]);
    expect(check.eligible).toBe(false);
  });

  it("does not trust a price dated in the future", () => {
    const now = new Date("2026-09-27T12:00:00Z");
    expect(freshnessOf(new Date("2026-09-28T12:00:00Z"), now)).toBe("OLD");
    expect(freshnessOf(new Date("2026-09-27T12:01:00Z"), now)).toBe("LIVE");
  });
});

describe("French wording", () => {
  it("does not elide before an aspirated h or 'yaourt'", () => {
    expect(partitive("haricots verts")).toBe("de ");
    expect(partitive("yaourt")).toBe("de ");
    expect(partitive("huile d'olive")).toBe("d'");
  });

  it("uses the plural from 2", () => {
    expect(formatQuantity(1.5, "pinch")).toBe("1,5 pincée");
    expect(formatQuantity(2, "pinch")).toBe("2 pincées");
  });
});

describe("recipe tags", () => {
  it("only claims what the recipe delivers", async () => {
    const { RECIPES: all, TAG_RULES } = await import("@/data/recipes");
    const { recipeNutritionPerServing } = await import("./recipes/nutrition");
    const { checkRecipeDiet: diet } = await import("./catalog/diets");
    const index = demoInput().ingredients;
    for (const r of all) {
      const n = recipeNutritionPerServing(r, index).nutrients;
      if (r.tags.includes("rapide")) expect(r.prepMinutes + r.cookMinutes, r.slug).toBeLessThanOrEqual(TAG_RULES.quickMaxMinutes);
      if (r.tags.includes("leger")) expect(n.energyKcal, r.slug).toBeLessThanOrEqual(TAG_RULES.lightMaxKcal);
      if (r.tags.includes("vegan")) expect(diet(r, index, "vegan").compatible, r.slug).toBe(true);
    }
    expect(all.find((r) => r.slug === "salade-fruits-menthe")?.tags).not.toContain("vegan");
  });

  it("soy sauce carries gluten, so soy-sauce dishes are not gluten-free", () => {
    const index = demoInput().ingredients;
    expect(index.get("ing_sauce-soja")?.allergens).toEqual(expect.arrayContaining(["soy", "gluten"]));
  });
});
