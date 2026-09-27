/**
 * Development seed: reference data (compositions, ingredients, recipes,
 * retailers), the clearly-labelled DEMO store and catalogue, and a demo
 * account with the household "Alex + Camille".
 *
 * Idempotent: safe to run several times. Refuses to create the demo account
 * in production.
 *
 * Run with: pnpm db:seed
 */
import "../env";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DEMO_PANTRY_SLUGS, DEMO_PRODUCTS, DEMO_RETAILER, DEMO_STORE } from "../../src/data/demo-catalog";
import { demoOffer, demoProductId } from "../../src/data/demo-offers";
import { buildSeedIngredients, INGREDIENT_SEEDS, ingredientId } from "../../src/data/ingredients";
import usda from "../../data/reference/usda-subset.json";
import { RECIPES } from "../../src/data/recipes";
import { indexIngredients } from "../../src/domain/catalog/types";
import { validateRecipe } from "../../src/domain/recipes/validation";
import * as t from "../../src/server/db/schema";
import { FRENCH_RETAILERS } from "../../src/server/retail/registry";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL manquant");
const client = postgres(url, { max: 1 });
const database = drizzle(client, { schema: t, casing: "snake_case" });

function log(message: string) {
  process.stdout.write(`${message}\n`);
}

async function seedReference() {
  const ingredients = buildSeedIngredients();
  const index = indexIngredients(ingredients);

  for (const seed of INGREDIENT_SEEDS) {
    const food = (usda.foods as Record<string, (typeof usda.foods)[keyof typeof usda.foods]>)[seed.fdcId];
    const compositionId = `comp_usda_${seed.fdcId}`;
    const values = {
      source: food.source,
      sourceRef: food.fdcId,
      sourceLabel: food.sourceLabel,
      sourceVersion: food.sourceVersion,
      sourceName: food.name,
      license: "Domaine public (USDA FoodData Central)",
      url: food.url,
      quality: "VERIFIED",
      per100g: food.per100g,
    };
    await database
      .insert(t.foodCompositions)
      .values({ id: compositionId, ...values })
      .onConflictDoUpdate({ target: t.foodCompositions.id, set: values });

    const ing = index.get(ingredientId(seed.slug));
    if (!ing) continue;
    const row = {
      slug: ing.slug,
      name: ing.name,
      aisle: ing.aisle,
      purchaseUnit: ing.purchaseUnit,
      measures: ing.measures,
      measuresSource: seed.measuresSource ?? null,
      compositionId,
      allergens: ing.allergens,
      animalOrigin: ing.animalOrigin,
      isPork: ing.isPork,
      containsAlcohol: ing.containsAlcohol,
      isStaple: ing.isStaple,
      shelfLifeDays: ing.shelfLifeDays,
      cookedYield: ing.cookedYield,
      proteinFamily: ing.proteinFamily,
      pieceLabel: ing.pieceLabel,
    };
    await database.insert(t.ingredients).values({ id: ing.id, ...row }).onConflictDoUpdate({ target: t.ingredients.id, set: row });
  }
  log(`Ingrédients : ${ingredients.length}`);

  let validated = 0;
  for (const recipe of RECIPES) {
    const check = validateRecipe(recipe, index);
    const row = {
      slug: recipe.slug,
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      difficulty: recipe.difficulty,
      equipment: recipe.equipment,
      tags: recipe.tags,
      cuisine: recipe.cuisine,
      seasonMonths: recipe.seasonMonths,
      mealTypes: recipe.mealTypes,
      keepsWell: recipe.keepsWell,
      origin: recipe.origin,
      reviewStatus: check.valid ? "validated" : "draft",
      // Photos are chosen later (pnpm photos:recettes / back-office): never reset here.
    };
    if (!check.valid) log(`Recette ${recipe.slug} laissée en brouillon : ${check.errors.join(" ; ")}`);
    else validated++;
    await database.transaction(async (tx) => {
      await tx.insert(t.recipes).values({ id: recipe.id, ...row }).onConflictDoUpdate({ target: t.recipes.id, set: row });
      await tx.delete(t.recipeIngredients).where(eq(t.recipeIngredients.recipeId, recipe.id));
      await tx.delete(t.recipeSteps).where(eq(t.recipeSteps.recipeId, recipe.id));
      await tx.insert(t.recipeIngredients).values(
        recipe.ingredients.map((ri, i) => ({
          id: `${recipe.id}_i${i}`,
          recipeId: recipe.id,
          position: i,
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
          role: ri.role,
          note: ri.note ?? null,
        })),
      );
      await tx.insert(t.recipeSteps).values(
        recipe.steps.map((s) => ({
          id: `${recipe.id}_s${s.order}`,
          recipeId: recipe.id,
          position: s.order,
          text: s.text,
          timerSeconds: s.timerSeconds ?? null,
        })),
      );
    });
  }
  log(`Recettes validées : ${validated}/${RECIPES.length}`);
}

async function seedRetail() {
  for (const r of FRENCH_RETAILERS) {
    const row = { slug: r.slug, name: r.name, website: r.website, integrationStatus: r.integrationStatus, integrationNotes: r.notes, isDemo: false };
    await database.insert(t.retailers).values({ id: r.id, ...row }).onConflictDoUpdate({ target: t.retailers.id, set: row });
  }
  const demoRow = {
    slug: DEMO_RETAILER.slug,
    name: DEMO_RETAILER.name,
    website: null,
    integrationStatus: "demo",
    integrationNotes: "Enseigne fictive. Produits et prix de démonstration, sans lien avec une enseigne réelle.",
    isDemo: true,
  };
  await database.insert(t.retailers).values({ id: DEMO_RETAILER.id, ...demoRow }).onConflictDoUpdate({ target: t.retailers.id, set: demoRow });
  const storeRow = {
    retailerId: DEMO_STORE.retailerId,
    externalId: "demo",
    name: DEMO_STORE.name,
    city: DEMO_STORE.city,
    postcode: null,
    latitude: null,
    longitude: null,
    isDrive: false,
    provider: "demo",
  };
  await database.insert(t.stores).values({ id: DEMO_STORE.id, ...storeRow }).onConflictDoUpdate({ target: t.stores.id, set: storeRow });

  const fetchedAt = new Date();
  for (const p of DEMO_PRODUCTS) {
    const offer = demoOffer(p, fetchedAt);
    const productRow = {
      retailerId: DEMO_RETAILER.id,
      externalId: null,
      ean: null,
      name: p.name,
      brand: p.brand,
      packLabel: p.packLabel,
      packQuantity: p.packQuantity,
      packUnit: p.packUnit,
      isOrganic: p.isOrganic ?? false,
      isStoreBrand: p.isStoreBrand ?? false,
      sourceUrl: null,
      provider: "demo",
    };
    const productId = demoProductId(p);
    await database.insert(t.retailProducts).values({ id: productId, ...productRow }).onConflictDoUpdate({ target: t.retailProducts.id, set: productRow });
    // One current DEMO price per product (demo prices have no history worth keeping).
    await database.delete(t.retailPrices).where(eq(t.retailPrices.productId, productId));
    await database.insert(t.retailPrices).values({
      id: `${productId}_price`,
      productId,
      storeId: DEMO_STORE.id,
      priceCents: offer.priceCents,
      unitPriceCents: offer.unitPriceCents,
      promotionLabel: null,
      promotionValidUntil: null,
      availability: "available",
      fetchedAt,
      provider: "demo",
      quality: "DEMO",
      sourceUrl: null,
    });
    await database
      .insert(t.productMappings)
      .values({ id: `map_${productId}`, ingredientId: ingredientId(p.ingredient), productId, priority: 0, substitutionNote: p.substitution ?? null, status: "active" })
      .onConflictDoNothing();
  }
  log(`Catalogue DEMO : ${DEMO_PRODUCTS.length} produits (prix fictifs)`);
}

async function seedFlags() {
  const flags = [
    { key: "open_prices_sync", enabled: false, description: "Synchronisation des prix observés Open Prices" },
    { key: "assistant", enabled: false, description: "Assistant conversationnel de modification du planning (prévu)" },
    { key: "household_invitations", enabled: false, description: "Invitation d'un second compte dans le foyer" },
  ];
  for (const f of flags) {
    await database.insert(t.featureFlags).values(f).onConflictDoNothing();
  }
}

async function seedDemoAccount() {
  if (!process.env.BETTER_AUTH_SECRET) {
    log("Compte démo ignoré : BETTER_AUTH_SECRET absent de .env / .env.local (le catalogue est bien à jour).");
    return;
  }
  if (process.env.NODE_ENV === "production") {
    log("Production : compte de démonstration non créé.");
    return;
  }
  const email = "demo@foodlek.local";
  const existing = await database.select({ id: t.user.id }).from(t.user).where(eq(t.user.email, email)).limit(1);
  if (existing.length > 0) {
    log(`Compte démo déjà présent : ${email}`);
    await ensureDemoPlan();
    return;
  }
  // Create the account through Better Auth so the password is hashed exactly as at sign-up.
  const { getAuth } = await import("../../src/server/auth/better-auth");
  await getAuth().api.signUpEmail({ body: { email, password: "demo-foodlek-2026", name: "Alex" } });
  const [u] = await database.select({ id: t.user.id }).from(t.user).where(eq(t.user.email, email)).limit(1);
  const householdId = "hh_demo";
  await database.insert(t.households).values({ id: householdId, name: "Alex & Camille", onboardingCompletedAt: new Date() }).onConflictDoNothing();
  await database.insert(t.householdMemberships).values({ id: "hm_demo", householdId, userId: u.id, role: "owner" }).onConflictDoNothing();
  await database
    .insert(t.householdSettings)
    .values({
      householdId,
      adults: 2,
      children: 0,
      mealSchedule: { breakfast: [], lunch: [0, 1, 2, 3, 4], dinner: [0, 1, 2, 3, 4, 5, 6], snack: [] },
      generalAppetite: "normal",
      budgetCents: 9000,
      budgetMode: "target",
      maxWeekdayMinutes: 40,
      maxWeekendMinutes: 75,
      skill: "intermediate",
      equipment: ["hob", "oven", "microwave"],
      useLeftovers: true,
      storeId: DEMO_STORE.id,
    })
    .onConflictDoNothing();
  const thisYear = new Date().getFullYear();
  await database
    .insert(t.householdMembers)
    .values([
      {
        id: "mem_demo_alex",
        householdId,
        userId: u.id,
        displayName: "Alex",
        position: 0,
        profileMode: "detailed",
        sex: "male",
        birthYear: thisYear - 28,
        heightCm: 180,
        weightKg: 90,
        activity: "moderate",
        goal: "lose",
        targetWeightKg: 80,
        goalWeeks: 24,
        highProtein: true,
      },
      {
        id: "mem_demo_camille",
        householdId,
        displayName: "Camille",
        position: 1,
        profileMode: "detailed",
        sex: "female",
        birthYear: thisYear - 27,
        heightCm: 165,
        weightKg: 60,
        activity: "light",
        goal: "maintain",
      },
    ])
    .onConflictDoNothing();
  await database
    .insert(t.pantryItems)
    .values(DEMO_PANTRY_SLUGS.map((slug) => ({ id: `pan_demo_${slug}`, householdId, ingredientId: ingredientId(slug), quantity: null })))
    .onConflictDoNothing();
  log(`Compte démo créé : ${email} / demo-foodlek-2026 (développement uniquement)`);
  await ensureDemoPlan();
}

/** The demo household always has a menu for the current week. */
async function ensureDemoPlan() {
  const { findCurrentPlanId, generatePlan } = await import("../../src/server/services/plans");
  const { planningWeekStart } = await import("../../src/lib/week");
  if (await findCurrentPlanId("hh_demo")) return;
  await generatePlan("hh_demo", planningWeekStart(new Date()));
  log("Planning de la semaine généré pour le foyer démo.");
}

async function main() {
  await database.execute(sql`select 1`);
  await seedReference();
  await seedRetail();
  await seedFlags();
  await seedDemoAccount();
  await client.end();
  log("Seed terminé.");
  process.exit(0);
}

main().catch(async (error: unknown) => {
  process.stderr.write(`${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`);
  await client.end();
  process.exit(1);
});
