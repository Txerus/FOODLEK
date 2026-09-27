import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import type { DataQuality } from "@/domain/common/data-quality";
import {
  indexIngredients,
  type Aisle,
  type Allergen,
  type AnimalOrigin,
  type Difficulty,
  type Equipment,
  type Ingredient,
  type IngredientIndex,
  type IngredientRole,
  type MealType,
  type ProteinFamily,
  type Recipe,
  type RecipeOrigin,
} from "@/domain/catalog/types";
import type { CompositionSource } from "@/domain/nutrition/nutrients";
import type { PurchaseUnit, Unit } from "@/domain/units/units";
import { WHOLE_PIECE_SLUGS } from "@/data/ingredients";
import { db } from "../db/client";
import * as t from "../db/schema";

export interface Catalog {
  ingredients: Ingredient[];
  ingredientIndex: IngredientIndex;
  recipes: Recipe[];
  recipesById: Map<string, Recipe>;
  recipesBySlug: Map<string, Recipe>;
  loadedAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const globalForCatalog = globalThis as unknown as { __foodlekCatalog?: Promise<Catalog> & { loadedAt?: number } };

async function loadFromDb(): Promise<Catalog> {
  const database = db();
  const [ingredientRows, compositionRows, recipeRows] = await Promise.all([
    database.select().from(t.ingredients),
    database.select().from(t.foodCompositions),
    database.select().from(t.recipes).where(eq(t.recipes.reviewStatus, "validated")).orderBy(asc(t.recipes.title)),
  ]);
  const recipeIds = recipeRows.map((r) => r.id);
  const [riRows, stepRows] = recipeIds.length
    ? await Promise.all([
        database
          .select()
          .from(t.recipeIngredients)
          .where(inArray(t.recipeIngredients.recipeId, recipeIds))
          .orderBy(asc(t.recipeIngredients.position)),
        database
          .select()
          .from(t.recipeSteps)
          .where(inArray(t.recipeSteps.recipeId, recipeIds))
          .orderBy(asc(t.recipeSteps.position)),
      ])
    : [[], []];

  const compositions = new Map(compositionRows.map((c) => [c.id, c]));
  const ingredients: Ingredient[] = ingredientRows.map((row) => {
    const c = row.compositionId ? compositions.get(row.compositionId) : undefined;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      aisle: row.aisle as Aisle,
      purchaseUnit: row.purchaseUnit as PurchaseUnit,
      measures: row.measures,
      composition: c
        ? {
            per100g: c.per100g,
            source: c.source as CompositionSource,
            sourceRef: c.sourceRef,
            sourceLabel: c.sourceLabel,
            sourceVersion: c.sourceVersion,
            quality: c.quality as DataQuality,
          }
        : null,
      allergens: row.allergens as Allergen[],
      animalOrigin: row.animalOrigin as AnimalOrigin,
      isPork: row.isPork,
      containsAlcohol: row.containsAlcohol,
      isStaple: row.isStaple,
      shelfLifeDays: row.shelfLifeDays,
      cookedYield: row.cookedYield,
      proteinFamily: (row.proteinFamily as ProteinFamily | null) ?? null,
      pieceLabel: row.pieceLabel ?? null,
      wholePieces: WHOLE_PIECE_SLUGS.has(row.slug),
      photo: row.imageUrl ? { url: row.imageUrl, credit: row.imageCredit, sourceUrl: row.imageSourceUrl } : null,
    };
  });

  const ingredientsByRecipe = new Map<string, Recipe["ingredients"]>();
  for (const ri of riRows) {
    const list = ingredientsByRecipe.get(ri.recipeId) ?? [];
    list.push({
      ingredientId: ri.ingredientId,
      quantity: ri.quantity,
      unit: ri.unit as Unit,
      role: ri.role as IngredientRole,
      ...(ri.note ? { note: ri.note } : {}),
    });
    ingredientsByRecipe.set(ri.recipeId, list);
  }
  const stepsByRecipe = new Map<string, Recipe["steps"]>();
  for (const s of stepRows) {
    const list = stepsByRecipe.get(s.recipeId) ?? [];
    list.push({ order: s.position, text: s.text, ...(s.timerSeconds ? { timerSeconds: s.timerSeconds } : {}) });
    stepsByRecipe.set(s.recipeId, list);
  }

  const recipes: Recipe[] = recipeRows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    difficulty: r.difficulty as Difficulty,
    equipment: r.equipment as Equipment[],
    ingredients: ingredientsByRecipe.get(r.id) ?? [],
    steps: stepsByRecipe.get(r.id) ?? [],
    tags: r.tags,
    cuisine: r.cuisine,
    seasonMonths: r.seasonMonths,
    mealTypes: r.mealTypes as MealType[],
    keepsWell: r.keepsWell,
    origin: r.origin as RecipeOrigin,
    imageUrl: r.imageUrl,
    imageCredit: r.imageCredit,
    imageSourceUrl: r.imageSourceUrl,
  }));

  return {
    ingredients,
    ingredientIndex: indexIngredients(ingredients),
    recipes,
    recipesById: new Map(recipes.map((r) => [r.id, r])),
    recipesBySlug: new Map(recipes.map((r) => [r.slug, r])),
    loadedAt: Date.now(),
  };
}

/**
 * The catalogue (ingredients + validated recipes) changes rarely; it is cached
 * in memory for a few minutes and invalidated by the back-office.
 */
const globalForRefresh = globalThis as unknown as { __foodlekCatalogRefresh?: Promise<Catalog> };

/**
 * The catalogue, cached for 5 minutes. Once expired, the stale copy is still
 * served while a single refresh runs in the background: many requests at the
 * expiry moment do not all reload it from the database.
 */
export async function getCatalog(): Promise<Catalog> {
  const cached = globalForCatalog.__foodlekCatalog;
  if (cached) {
    const catalog = await cached;
    if (Date.now() - catalog.loadedAt < TTL_MS) return catalog;
    if (!globalForRefresh.__foodlekCatalogRefresh) {
      const refresh = loadFromDb();
      globalForRefresh.__foodlekCatalogRefresh = refresh;
      refresh
        .then((fresh) => {
          // Ignored if the catalogue was invalidated meanwhile (admin change).
          if (globalForRefresh.__foodlekCatalogRefresh === refresh) globalForCatalog.__foodlekCatalog = Promise.resolve(fresh);
        })
        .catch(() => {
          // Keep serving the stale copy; the next request tries again.
        })
        .finally(() => {
          if (globalForRefresh.__foodlekCatalogRefresh === refresh) globalForRefresh.__foodlekCatalogRefresh = undefined;
        });
    }
    return catalog;
  }
  const loading = loadFromDb();
  globalForCatalog.__foodlekCatalog = loading;
  try {
    return await loading;
  } catch (error) {
    globalForCatalog.__foodlekCatalog = undefined;
    throw error;
  }
}

export function invalidateCatalog(): void {
  globalForCatalog.__foodlekCatalog = undefined;
  globalForRefresh.__foodlekCatalogRefresh = undefined;
}
