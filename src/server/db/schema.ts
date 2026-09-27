import { relations, sql } from "drizzle-orm";
import { bigint, boolean, date, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { NutrientsPer100g } from "@/domain/nutrition/nutrients";
import type { IngredientMeasures } from "@/domain/units/units";

/**
 * Database schema. Column names are snake_case (see drizzle `casing` option).
 * Business enums are stored as text and validated with Zod at the edges, which
 * keeps migrations simple when a value is added.
 */

export interface RecipePhotoCandidate {
  src: string;
  alt: string;
  credit: string;
  sourceUrl: string;
  width: number;
  height: number;
}

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ---------------------------------------------------------------------------
// Authentication (Better Auth core tables)
// ---------------------------------------------------------------------------

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  image: text(),
  /** "user" | "admin" — admin unlocks the back-office. */
  role: text().notNull().default("user"),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  // Milliseconds since the epoch: does not fit in a 32-bit integer.
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Households
// ---------------------------------------------------------------------------

export const households = pgTable("households", {
  id: text().primaryKey(),
  name: text().notNull(),
  /** Subscription plan, for the SaaS evolution ("free" for now). */
  plan: text().notNull().default("free"),
  onboardingCompletedAt: timestamp({ withTimezone: true }),
  /** Autosaved wizard draft, so the onboarding can be resumed on any device. */
  onboardingDraft: jsonb().$type<Record<string, unknown>>(),
  ...timestamps,
});

/** Accounts allowed to manage a household (several partners can share one). */
export const householdMemberships = pgTable(
  "household_memberships",
  {
    id: text().primaryKey(),
    householdId: text()
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** "owner" | "editor" */
    role: text().notNull().default("owner"),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.householdId, t.userId), index().on(t.userId)],
);

export const householdSettings = pgTable("household_settings", {
  householdId: text()
    .primaryKey()
    .references(() => households.id, { onDelete: "cascade" }),
  adults: integer().notNull().default(2),
  children: integer().notNull().default(0),
  /** mealType → days of week (0 = Monday … 6 = Sunday). */
  mealSchedule: jsonb().$type<Record<string, number[]>>().notNull(),
  generalAppetite: text().notNull().default("normal"),
  budgetCents: integer().notNull(),
  budgetMode: text().notNull().default("target"),
  maxWeekdayMinutes: integer().notNull().default(40),
  maxWeekendMinutes: integer().notNull().default(75),
  skill: text().notNull().default("intermediate"),
  equipment: text()
    .array()
    .notNull()
    .default(sql`ARRAY['hob']::text[]`),
  batchCooking: boolean().notNull().default(false),
  preferQuickMeals: boolean().notNull().default(false),
  maxDistinctRecipes: integer(),
  organic: text().notNull().default("indifferent"),
  storeBrand: text().notNull().default("indifferent"),
  acceptPromotions: boolean().notNull().default(true),
  repetitionTolerance: text().notNull().default("medium"),
  useLeftovers: boolean().notNull().default(true),
  storeId: text().references(() => stores.id, { onDelete: "set null" }),
  ...timestamps,
});

/**
 * People who eat. A member may or may not have an account. Body measurements
 * are optional (simplified profile) and are sensitive: they are only read
 * after a household access check and never logged.
 */
export const householdMembers = pgTable(
  "household_members",
  {
    id: text().primaryKey(),
    householdId: text()
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    displayName: text().notNull(),
    position: integer().notNull().default(0),
    isChild: boolean().notNull().default(false),
    profileMode: text().notNull().default("simplified"),
    sex: text(),
    birthYear: integer(),
    /** Optional: makes the age exact (only the year is otherwise known). */
    birthMonth: integer(),
    heightCm: real(),
    weightKg: real(),
    activity: text().notNull().default("light"),
    goal: text().notNull().default("none"),
    targetWeightKg: real(),
    goalWeeks: integer(),
    highProtein: boolean().notNull().default(false),
    appetite: text().notNull().default("normal"),
    specialSituations: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    diets: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    allergies: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    excludedIngredientIds: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    likedIngredientIds: text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    ...timestamps,
  },
  (t) => [index().on(t.householdId)],
);

// ---------------------------------------------------------------------------
// Food composition, ingredients, recipes
// ---------------------------------------------------------------------------

export const foodCompositions = pgTable(
  "food_compositions",
  {
    id: text().primaryKey(),
    /** CIQUAL | USDA_SR_LEGACY | USDA_FOUNDATION | OPEN_FOOD_FACTS */
    source: text().notNull(),
    sourceRef: text().notNull(),
    sourceLabel: text().notNull(),
    sourceVersion: text().notNull(),
    sourceName: text().notNull(),
    license: text().notNull(),
    url: text(),
    quality: text().notNull(),
    per100g: jsonb().$type<NutrientsPer100g>().notNull(),
    importedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.source, t.sourceRef, t.sourceVersion)],
);

export const ingredients = pgTable("ingredients", {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  aisle: text().notNull(),
  purchaseUnit: text().notNull(),
  measures: jsonb().$type<IngredientMeasures>().notNull(),
  measuresSource: text(),
  compositionId: text().references(() => foodCompositions.id, { onDelete: "set null" }),
  allergens: text()
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  animalOrigin: text().notNull(),
  isPork: boolean().notNull().default(false),
  containsAlcohol: boolean().notNull().default(false),
  isStaple: boolean().notNull().default(false),
  shelfLifeDays: integer().notNull(),
  cookedYield: real(),
  proteinFamily: text(),
  pieceLabel: jsonb().$type<{ one: string; many: string }>(),
  /** Generic photo of the ingredient (Pexels), shown when a product has none. */
  imageUrl: text(),
  imageCredit: text(),
  imageSourceUrl: text(),
  ...timestamps,
});

export const recipes = pgTable(
  "recipes",
  {
    id: text().primaryKey(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    description: text().notNull(),
    servings: integer().notNull(),
    prepMinutes: integer().notNull(),
    cookMinutes: integer().notNull(),
    difficulty: text().notNull(),
    equipment: text().array().notNull(),
    tags: text().array().notNull(),
    cuisine: text().notNull(),
    seasonMonths: integer().array().notNull(),
    mealTypes: text().array().notNull(),
    keepsWell: boolean().notNull(),
    origin: text().notNull(),
    /** "draft" | "validated" — only validated recipes are used by the planner. */
    reviewStatus: text().notNull().default("draft"),
    imageUrl: text(),
    imageCredit: text(),
    /** Page of the photo at its source (Pexels…), for the credit link. */
    imageSourceUrl: text(),
    /** Photos proposed by the photo search, to choose from in the back-office. */
    imageCandidates: jsonb().$type<RecipePhotoCandidate[]>(),
    ...timestamps,
  },
  (t) => [index().on(t.reviewStatus)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: text().primaryKey(),
    recipeId: text()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    ingredientId: text()
      .notNull()
      .references(() => ingredients.id, { onDelete: "restrict" }),
    quantity: real().notNull(),
    unit: text().notNull(),
    role: text().notNull(),
    note: text(),
  },
  (t) => [index().on(t.recipeId)],
);

export const recipeSteps = pgTable(
  "recipe_steps",
  {
    id: text().primaryKey(),
    recipeId: text()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    text: text().notNull(),
    timerSeconds: integer(),
  },
  (t) => [index().on(t.recipeId)],
);

// ---------------------------------------------------------------------------
// Retail: retailers, stores, products, prices, mappings
// ---------------------------------------------------------------------------

export const retailers = pgTable("retailers", {
  id: text().primaryKey(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  isDemo: boolean().notNull().default(false),
  website: text(),
  /** "demo" | "live" | "unavailable" | "planned" */
  integrationStatus: text().notNull(),
  integrationNotes: text(),
  ...timestamps,
});

export const stores = pgTable(
  "stores",
  {
    id: text().primaryKey(),
    retailerId: text()
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    externalId: text(),
    name: text().notNull(),
    city: text(),
    postcode: text(),
    latitude: real(),
    longitude: real(),
    isDrive: boolean().notNull().default(false),
    provider: text().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.retailerId), uniqueIndex().on(t.retailerId, t.externalId)],
);

export const retailProducts = pgTable(
  "retail_products",
  {
    id: text().primaryKey(),
    retailerId: text()
      .notNull()
      .references(() => retailers.id, { onDelete: "cascade" }),
    externalId: text(),
    ean: text(),
    name: text().notNull(),
    brand: text(),
    packLabel: text().notNull(),
    packQuantity: real().notNull(),
    packUnit: text().notNull(),
    isOrganic: boolean().notNull().default(false),
    isStoreBrand: boolean().notNull().default(false),
    sourceUrl: text(),
    /** Product photo (Open Food Facts, CC BY-SA), shown in the shopping list. */
    imageUrl: text(),
    provider: text().notNull(),
    /** Set for a product and price typed in by a household: only that household sees it. */
    householdId: text().references(() => households.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index().on(t.retailerId), index().on(t.ean), index().on(t.householdId)],
);

/** Price history: one row per observation. A price is only valid for its store and time. */
export const retailPrices = pgTable(
  "retail_prices",
  {
    id: text().primaryKey(),
    productId: text()
      .notNull()
      .references(() => retailProducts.id, { onDelete: "cascade" }),
    storeId: text().references(() => stores.id, { onDelete: "cascade" }),
    priceCents: integer(),
    unitPriceCents: integer(),
    promotionLabel: text(),
    promotionValidUntil: timestamp({ withTimezone: true }),
    /** "available" | "unavailable" | "unknown" */
    availability: text().notNull(),
    fetchedAt: timestamp({ withTimezone: true }).notNull(),
    provider: text().notNull(),
    /** DataQuality */
    quality: text().notNull(),
    sourceUrl: text(),
    /** For observed prices: the actual store or "médiane de N relevés". */
    observedWhere: text(),
  },
  (t) => [index().on(t.productId, t.storeId, t.fetchedAt)],
);

export const productMappings = pgTable(
  "product_mappings",
  {
    id: text().primaryKey(),
    ingredientId: text()
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    productId: text()
      .notNull()
      .references(() => retailProducts.id, { onDelete: "cascade" }),
    priority: integer().notNull().default(0),
    substitutionNote: text(),
    /** "active" | "needs_review" | "rejected" */
    status: text().notNull().default("active"),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.ingredientId, t.productId), index().on(t.ingredientId)],
);

// ---------------------------------------------------------------------------
// Pantry, plans, shopping
// ---------------------------------------------------------------------------

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: text().primaryKey(),
    householdId: text()
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    ingredientId: text()
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    /** In the ingredient's purchase unit; null means "I have enough". */
    quantity: real(),
    expiresOn: date(),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.householdId, t.ingredientId)],
);

export interface PreviousPlanState {
  seed: number;
  savedAt: string;
  slots: { date: string; dayIndex: number; mealType: string; recipeId: string | null; locked: boolean; eaterIds: string[] }[];
  checkedIngredientIds: string[];
}

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: text().primaryKey(),
    householdId: text()
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    weekStart: date().notNull(),
    status: text().notNull().default("active"),
    seed: integer().notNull(),
    storeId: text().references(() => stores.id, { onDelete: "set null" }),
    generatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Validation of a basket above a strict budget. */
    overBudgetAcceptedAt: timestamp({ withTimezone: true }),
    /** The week as it was before the last regeneration, to undo it. */
    previousState: jsonb().$type<PreviousPlanState>(),
    ...timestamps,
  },
  (t) => [index().on(t.householdId, t.weekStart)],
);

export const mealPlanSlots = pgTable(
  "meal_plan_slots",
  {
    id: text().primaryKey(),
    planId: text()
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    date: date().notNull(),
    dayIndex: integer().notNull(),
    mealType: text().notNull(),
    recipeId: text().references(() => recipes.id, { onDelete: "set null" }),
    locked: boolean().notNull().default(false),
    eaterIds: text().array().notNull(),
  },
  (t) => [uniqueIndex().on(t.planId, t.date, t.mealType)],
);

/**
 * The shopping list is derived from the plan on every read (so it is always
 * consistent with portions, packs and prices). Only what the user does with it
 * is stored: which lines are checked in the store.
 */
export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: text().primaryKey(),
    planId: text()
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    ingredientId: text()
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    checked: boolean().notNull().default(false),
    checkedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.planId, t.ingredientId)],
);

/** Recipe feedback: dislikes and "eaten recently" feed the next generations. */
export const recipeFeedback = pgTable(
  "recipe_feedback",
  {
    id: text().primaryKey(),
    householdId: text()
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    recipeId: text()
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    /** "dislike" | "eaten" */
    kind: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.householdId, t.kind)],
);

// ---------------------------------------------------------------------------
// Operations: sync logs, mapping issues, feature flags, analytics
// ---------------------------------------------------------------------------

export const syncLogs = pgTable(
  "sync_logs",
  {
    id: text().primaryKey(),
    provider: text().notNull(),
    retailerId: text().references(() => retailers.id, { onDelete: "set null" }),
    storeId: text().references(() => stores.id, { onDelete: "set null" }),
    /** "running" | "success" | "partial" | "failed" | "unavailable" */
    status: text().notNull(),
    itemCount: integer().notNull().default(0),
    message: text(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.provider, t.startedAt)],
);

export const mappingIssues = pgTable("mapping_issues", {
  id: text().primaryKey(),
  ingredientId: text().references(() => ingredients.id, { onDelete: "cascade" }),
  retailerId: text().references(() => retailers.id, { onDelete: "cascade" }),
  /** "no_product" | "unit_mismatch" | "user_report" */
  kind: text().notNull(),
  message: text().notNull(),
  status: text().notNull().default("open"),
  ...timestamps,
});

export const featureFlags = pgTable("feature_flags", {
  key: text().primaryKey(),
  enabled: boolean().notNull().default(false),
  description: text().notNull(),
  ...timestamps,
});

/** Privacy-friendly product analytics: event names and non-personal properties only. */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    properties: jsonb().$type<Record<string, string | number | boolean>>().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.name, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const recipesRelations = relations(recipes, ({ many }) => ({
  ingredients: many(recipeIngredients),
  steps: many(recipeSteps),
}));

export const recipeIngredientsRelations = relations(recipeIngredients, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeIngredients.recipeId], references: [recipes.id] }),
  ingredient: one(ingredients, { fields: [recipeIngredients.ingredientId], references: [ingredients.id] }),
}));

export const recipeStepsRelations = relations(recipeSteps, ({ one }) => ({
  recipe: one(recipes, { fields: [recipeSteps.recipeId], references: [recipes.id] }),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  composition: one(foodCompositions, { fields: [ingredients.compositionId], references: [foodCompositions.id] }),
}));

export const mealPlansRelations = relations(mealPlans, ({ many }) => ({
  slots: many(mealPlanSlots),
}));

export const mealPlanSlotsRelations = relations(mealPlanSlots, ({ one }) => ({
  plan: one(mealPlans, { fields: [mealPlanSlots.planId], references: [mealPlans.id] }),
}));
