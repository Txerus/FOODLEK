import { describe, expect, it } from "vitest";
import type { ShoppingLine } from "./aggregate";
import { mealCosts } from "./meal-cost";

function line(over: Partial<ShoppingLine>): ShoppingLine {
  return {
    ingredientId: "ing",
    ingredientName: "Ingrédient",
    aisle: "epicerie",
    unit: "g",
    needed: 0,
    fromPantry: 0,
    toBuy: 0,
    choices: [],
    purchasedQuantity: 0,
    leftover: 0,
    leftoverIsWaste: false,
    costCents: null,
    leftoverValueCents: 0,
    quality: "RECENT",
    priceMissing: false,
    usedIn: [],
    isStaple: false,
    ...over,
  };
}

describe("mealCosts", () => {
  it("charges each dish the value of what it uses, at the price paid", () => {
    const rice = line({
      ingredientName: "Riz",
      needed: 300,
      toBuy: 300,
      purchasedQuantity: 1000,
      costCents: 200,
      usedIn: [
        { mealKey: "lun-diner", recipeId: "r1", recipeTitle: "Curry", quantity: 200 },
        { mealKey: "mar-diner", recipeId: "r2", recipeTitle: "Chili", quantity: 100 },
      ],
    });
    const chicken = line({
      ingredientName: "Poulet",
      needed: 500,
      toBuy: 500,
      purchasedQuantity: 500,
      costCents: 600,
      usedIn: [{ mealKey: "lun-diner", recipeId: "r1", recipeTitle: "Curry", quantity: 500 }],
    });
    const costs = mealCosts([rice, chicken]);
    expect(costs.get("lun-diner")?.cents).toBe(40 + 600);
    expect(costs.get("mar-diner")?.cents).toBe(20);
    expect(costs.get("lun-diner")?.partial).toBe(false);
  });

  it("does not charge what is already in the pantry", () => {
    const oil = line({ needed: 30, fromPantry: 30, toBuy: 0, usedIn: [{ mealKey: "m", recipeId: "r", recipeTitle: "R", quantity: 30 }] });
    expect(mealCosts([oil]).get("m")).toMatchObject({ cents: 0, partial: false });
  });

  it("flags dishes with an ingredient without price", () => {
    const feta = line({ ingredientName: "Feta", needed: 100, toBuy: 100, priceMissing: true, usedIn: [{ mealKey: "m", recipeId: "r", recipeTitle: "R", quantity: 100 }] });
    const cost = mealCosts([feta]).get("m");
    expect(cost).toMatchObject({ partial: true, missingIngredients: ["Feta"], quality: "MISSING" });
  });
});
