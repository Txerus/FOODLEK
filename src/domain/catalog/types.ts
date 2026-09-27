import type { FoodComposition } from "../nutrition/nutrients";
import type { IngredientMeasures, PurchaseUnit, Unit } from "../units/units";

/** The 14 allergens that must be declared under EU regulation 1169/2011 (annex II). */
export const ALLERGENS = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  gluten: "Gluten",
  crustaceans: "Crustacés",
  eggs: "Œufs",
  fish: "Poisson",
  peanuts: "Arachides",
  soy: "Soja",
  milk: "Lait",
  nuts: "Fruits à coque",
  celery: "Céleri",
  mustard: "Moutarde",
  sesame: "Sésame",
  sulphites: "Sulfites",
  lupin: "Lupin",
  molluscs: "Mollusques",
};

export const AISLES = [
  "fruits_legumes",
  "boucherie",
  "poissonnerie",
  "frais",
  "epicerie",
  "surgeles",
  "boulangerie",
  "boissons",
  "autres",
] as const;
export type Aisle = (typeof AISLES)[number];

export const AISLE_LABELS: Record<Aisle, string> = {
  fruits_legumes: "Fruits & légumes",
  boucherie: "Boucherie",
  poissonnerie: "Poissonnerie",
  frais: "Produits frais",
  epicerie: "Épicerie",
  surgeles: "Surgelés",
  boulangerie: "Boulangerie",
  boissons: "Boissons",
  autres: "Autres",
};

/** What an ingredient is, for dietary reasoning. */
export type AnimalOrigin = "none" | "meat" | "poultry" | "fish" | "seafood" | "dairy" | "egg" | "honey";

export interface Ingredient {
  id: string;
  slug: string;
  name: string;
  aisle: Aisle;
  purchaseUnit: PurchaseUnit;
  measures: IngredientMeasures;
  composition: FoodComposition | null;
  allergens: Allergen[];
  animalOrigin: AnimalOrigin;
  isPork: boolean;
  containsAlcohol: boolean;
  /**
   * Staples (oil, salt, spices...) are bought in large containers and used over
   * many weeks; what remains is stock, not waste.
   */
  isStaple: boolean;
  /** Days it keeps once bought, used by the waste indicator. */
  shelfLifeDays: number;
  /**
   * Ratio cooked weight / raw weight for starches, to show "≈ 160 g de riz cuit".
   * Derived from paired raw/cooked reference entries.
   */
  cookedYield: number | null;
  /** Main protein family, used for variety and "je veux du poisson". */
  proteinFamily: ProteinFamily | null;
  /** Noun used when counting pieces ("2 œufs"). */
  pieceLabel: { one: string; many: string } | null;
  /** Generic photo of the ingredient (not of a product), with its credit. */
  photo?: { url: string; credit: string | null; sourceUrl: string | null } | null;
}

export type ProteinFamily = "poultry" | "beef" | "pork" | "fish" | "seafood" | "egg" | "legume" | "tofu" | "dairy";

export const INGREDIENT_ROLES = ["protein", "starch", "vegetable", "fat", "sauce", "aromatic", "garnish"] as const;
export type IngredientRole = (typeof INGREDIENT_ROLES)[number];

export interface RecipeIngredient {
  ingredientId: string;
  /** Quantity for the recipe's base number of servings. */
  quantity: number;
  unit: Unit;
  role: IngredientRole;
  /** Preparation note shown in the ingredient list ("en dés", "rincés"...). */
  note?: string;
}

export interface RecipeStep {
  order: number;
  text: string;
  timerSeconds?: number;
}

export type Difficulty = "easy" | "medium" | "hard";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Dessert ou goûter",
};

export const EQUIPMENT = ["hob", "oven", "microwave", "blender", "steamer", "wok"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  hob: "Plaques de cuisson",
  oven: "Four",
  microwave: "Micro-ondes",
  blender: "Mixeur",
  steamer: "Cuit-vapeur",
  wok: "Wok",
};

export type RecipeOrigin = "ORIGINAL_AI_ASSISTED" | "ORIGINAL" | "LICENSED";

export interface Recipe {
  id: string;
  slug: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: Difficulty;
  equipment: Equipment[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  tags: string[];
  cuisine: string;
  /** Months (1-12) in which the main fresh produce is in season in France. */
  seasonMonths: number[];
  mealTypes: MealType[];
  /** Keeps well in the fridge for the next day (leftovers / batch cooking). */
  keepsWell: boolean;
  origin: RecipeOrigin;
  imageUrl: string | null;
  imageCredit: string | null;
  /** Page of the photo at its source, for the credit link. */
  imageSourceUrl?: string | null;
}

export type IngredientIndex = ReadonlyMap<string, Ingredient>;

export function indexIngredients(list: readonly Ingredient[]): IngredientIndex {
  return new Map(list.map((i) => [i.id, i]));
}

export function totalMinutes(recipe: Recipe): number {
  return recipe.prepMinutes + recipe.cookMinutes;
}
