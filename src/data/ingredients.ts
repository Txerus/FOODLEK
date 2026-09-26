import usda from "../../data/reference/usda-subset.json";
import type { DataQuality } from "@/domain/common/data-quality";
import type { Aisle, Allergen, AnimalOrigin, Ingredient, ProteinFamily } from "@/domain/catalog/types";
import type { CompositionSource, FoodComposition } from "@/domain/nutrition/nutrients";
import type { IngredientMeasures, PurchaseUnit } from "@/domain/units/units";

/**
 * Seed ingredients. Composition values are NOT typed here: they are read from
 * data/reference/usda-subset.json (USDA FoodData Central, public domain), by
 * FDC id. Measures (piece weight, density, spoon weight) cite the USDA portion
 * they come from.
 */

export interface IngredientSeed {
  slug: string;
  name: string;
  aisle: Aisle;
  purchaseUnit: PurchaseUnit;
  fdcId: string;
  measures: IngredientMeasures;
  /** Where each measure comes from. */
  measuresSource?: string;
  allergens: Allergen[];
  animalOrigin: AnimalOrigin;
  isPork?: boolean;
  isStaple?: boolean;
  shelfLifeDays: number;
  /** Raw FDC id and cooked FDC id; the yield is derived from their energy densities. */
  cookedYieldFrom?: { raw: string; cooked: string };
  proteinFamily?: ProteinFamily;
  pieceLabel?: { one: string; many: string };
}

// Density = USDA portion weight / portion volume (1 tbsp = 15 ml, 1 cup = 236.59 ml).
const CUP_ML = 236.59;

export const INGREDIENT_SEEDS: IngredientSeed[] = [
  // Protéines
  { slug: "blanc-de-poulet", name: "Blanc de poulet", aisle: "boucherie", purchaseUnit: "g", fdcId: "171077", measures: {}, allergens: [], animalOrigin: "poultry", shelfLifeDays: 3, proteinFamily: "poultry" },
  { slug: "escalope-de-dinde", name: "Escalope de dinde", aisle: "boucherie", purchaseUnit: "g", fdcId: "174515", measures: {}, allergens: [], animalOrigin: "poultry", shelfLifeDays: 3, proteinFamily: "poultry" },
  { slug: "boeuf-hache-5", name: "Bœuf haché 5 % MG", aisle: "boucherie", purchaseUnit: "g", fdcId: "171790", measures: {}, allergens: [], animalOrigin: "meat", shelfLifeDays: 2, proteinFamily: "beef" },
  { slug: "pave-de-saumon", name: "Pavé de saumon", aisle: "poissonnerie", purchaseUnit: "g", fdcId: "175167", measures: {}, allergens: ["fish"], animalOrigin: "fish", shelfLifeDays: 2, proteinFamily: "fish" },
  { slug: "dos-de-cabillaud", name: "Dos de cabillaud", aisle: "poissonnerie", purchaseUnit: "g", fdcId: "171955", measures: {}, allergens: ["fish"], animalOrigin: "fish", shelfLifeDays: 2, proteinFamily: "fish" },
  { slug: "thon-au-naturel", name: "Thon au naturel", aisle: "epicerie", purchaseUnit: "g", fdcId: "173709", measures: {}, allergens: ["fish"], animalOrigin: "fish", shelfLifeDays: 730, proteinFamily: "fish" },
  { slug: "oeuf", pieceLabel: { one: "œuf", many: "œufs" }, name: "Œuf", aisle: "frais", purchaseUnit: "piece", fdcId: "171287", measures: { gramsPerPiece: 50 }, measuresSource: "USDA 171287 « 1 large = 50 g »", allergens: ["eggs"], animalOrigin: "egg", shelfLifeDays: 21, proteinFamily: "egg" },
  { slug: "pois-chiches", name: "Pois chiches cuits (égouttés)", aisle: "epicerie", purchaseUnit: "g", fdcId: "173800", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 730, proteinFamily: "legume" },
  { slug: "haricots-rouges", name: "Haricots rouges cuits (égouttés)", aisle: "epicerie", purchaseUnit: "g", fdcId: "174285", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 730, proteinFamily: "legume" },
  { slug: "lentilles-corail", name: "Lentilles corail", aisle: "epicerie", purchaseUnit: "g", fdcId: "174284", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 365, proteinFamily: "legume" },
  { slug: "tofu-ferme", name: "Tofu ferme", aisle: "frais", purchaseUnit: "g", fdcId: "172475", measures: {}, allergens: ["soy"], animalOrigin: "none", shelfLifeDays: 20, proteinFamily: "tofu" },

  // Produits laitiers
  { slug: "yaourt-grec-0", name: "Yaourt à la grecque 0 %", aisle: "frais", purchaseUnit: "g", fdcId: "170894", measures: {}, allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 20 },
  { slug: "feta", name: "Feta", aisle: "frais", purchaseUnit: "g", fdcId: "173420", measures: {}, allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 20 },
  { slug: "mozzarella", name: "Mozzarella", aisle: "frais", purchaseUnit: "g", fdcId: "170847", measures: {}, allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 10 },
  { slug: "parmesan-rape", name: "Parmesan râpé", aisle: "frais", purchaseUnit: "g", fdcId: "325036", measures: { gramsPerTbsp: 7.6 }, measuresSource: "USDA 325036 « 1 tablespoon = 7,6 g »", allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 30 },
  { slug: "gruyere-rape", name: "Gruyère râpé", aisle: "frais", purchaseUnit: "g", fdcId: "171242", measures: {}, allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 30 },
  { slug: "creme-legere", name: "Crème épaisse légère", aisle: "frais", purchaseUnit: "g", fdcId: "171256", measures: { gramsPerMl: 1.0, gramsPerTbsp: 15 }, measuresSource: "USDA 171256 « 1 tbsp = 15 g »", allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 10 },
  { slug: "lait-demi-ecreme", name: "Lait demi-écrémé", aisle: "frais", purchaseUnit: "ml", fdcId: "172205", measures: { gramsPerMl: 246 / CUP_ML }, measuresSource: "USDA 172205 « 1 cup = 246 g »", allergens: ["milk"], animalOrigin: "dairy", shelfLifeDays: 7 },
  { slug: "beurre", name: "Beurre", aisle: "frais", purchaseUnit: "g", fdcId: "173410", measures: { gramsPerTbsp: 14.2 }, measuresSource: "USDA 173410 « 1 tbsp = 14,2 g »", allergens: ["milk"], animalOrigin: "dairy", isStaple: true, shelfLifeDays: 60 },

  // Féculents
  { slug: "riz-long", name: "Riz long grain", aisle: "epicerie", purchaseUnit: "g", fdcId: "168877", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 540, cookedYieldFrom: { raw: "168877", cooked: "168878" } },
  { slug: "pates", name: "Pâtes sèches", aisle: "epicerie", purchaseUnit: "g", fdcId: "169736", measures: {}, allergens: ["gluten"], animalOrigin: "none", shelfLifeDays: 540, cookedYieldFrom: { raw: "169736", cooked: "169737" } },
  { slug: "semoule-couscous", name: "Semoule de couscous", aisle: "epicerie", purchaseUnit: "g", fdcId: "169699", measures: {}, allergens: ["gluten"], animalOrigin: "none", shelfLifeDays: 365 },
  { slug: "quinoa", name: "Quinoa", aisle: "epicerie", purchaseUnit: "g", fdcId: "168874", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 365 },
  { slug: "pommes-de-terre", name: "Pommes de terre", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170026", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 30 },
  { slug: "patate-douce", name: "Patate douce", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "168482", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 21 },
  { slug: "tortilla-ble", pieceLabel: { one: "tortilla", many: "tortillas" }, name: "Tortilla de blé (20 cm)", aisle: "boulangerie", purchaseUnit: "piece", fdcId: "175037", measures: { gramsPerPiece: 49 }, measuresSource: "USDA 175037 « 1 tortilla (approx 7-8\" dia) = 49 g »", allergens: ["gluten"], animalOrigin: "none", shelfLifeDays: 20 },
  { slug: "baguette", name: "Pain (baguette)", aisle: "boulangerie", purchaseUnit: "g", fdcId: "172675", measures: {}, allergens: ["gluten"], animalOrigin: "none", shelfLifeDays: 2 },

  // Légumes & fruits
  { slug: "courgette", pieceLabel: { one: "courgette", many: "courgettes" }, name: "Courgette", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169291", measures: { gramsPerPiece: 196 }, measuresSource: "USDA 169291 « 1 medium = 196 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "carotte", pieceLabel: { one: "carotte", many: "carottes" }, name: "Carotte", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170393", measures: { gramsPerPiece: 61 }, measuresSource: "USDA 170393 « 1 medium = 61 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 21 },
  { slug: "oignon", pieceLabel: { one: "oignon", many: "oignons" }, name: "Oignon jaune", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170000", measures: { gramsPerPiece: 110 }, measuresSource: "USDA 170000 « 1 medium = 110 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 30 },
  { slug: "ail", name: "Ail", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "1104647", measures: {}, allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 60 },
  { slug: "poivron-rouge", pieceLabel: { one: "poivron", many: "poivrons" }, name: "Poivron rouge", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170108", measures: { gramsPerPiece: 119 }, measuresSource: "USDA 170108 « 1 medium = 119 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "tomate", pieceLabel: { one: "tomate", many: "tomates" }, name: "Tomate", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170457", measures: { gramsPerPiece: 123 }, measuresSource: "USDA 170457 « 1 medium whole = 123 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 6 },
  { slug: "tomates-concassees", name: "Tomates concassées (conserve)", aisle: "epicerie", purchaseUnit: "g", fdcId: "170051", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 730 },
  { slug: "concentre-de-tomate", name: "Concentré de tomate", aisle: "epicerie", purchaseUnit: "g", fdcId: "170459", measures: { gramsPerTbsp: 16 }, measuresSource: "USDA 170459 « 1 tbsp = 16 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 540 },
  { slug: "epinards-surgeles", name: "Épinards hachés surgelés", aisle: "surgeles", purchaseUnit: "g", fdcId: "169287", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 240 },
  { slug: "brocoli", name: "Brocoli", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "747447", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "haricots-verts-surgeles", name: "Haricots verts surgelés", aisle: "surgeles", purchaseUnit: "g", fdcId: "169962", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 240 },
  { slug: "champignons-de-paris", name: "Champignons de Paris", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169251", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "concombre", name: "Concombre", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "2346406", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "salade-verte", name: "Salade verte", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169249", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "poireau", name: "Poireau", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169246", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 10 },
  { slug: "chou-fleur", name: "Chou-fleur", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "2685573", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "petits-pois-surgeles", name: "Petits pois surgelés", aisle: "surgeles", purchaseUnit: "g", fdcId: "170016", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 240 },
  { slug: "aubergine", name: "Aubergine", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "2685577", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "mais-doux", name: "Maïs doux (conserve, égoutté)", aisle: "epicerie", purchaseUnit: "g", fdcId: "169214", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 730 },
  { slug: "avocat", pieceLabel: { one: "avocat", many: "avocats" }, name: "Avocat", aisle: "fruits_legumes", purchaseUnit: "piece", fdcId: "171705", measures: { gramsPerPiece: 201 }, measuresSource: "USDA 171705 « 1 avocado = 201 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "citron", pieceLabel: { one: "citron", many: "citrons" }, name: "Citron", aisle: "fruits_legumes", purchaseUnit: "piece", fdcId: "167746", measures: { gramsPerPiece: 58 }, measuresSource: "USDA 167746 « 1 fruit (2-1/8\" dia) = 58 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 21 },
  { slug: "oignon-nouveau", pieceLabel: { one: "oignon nouveau", many: "oignons nouveaux" }, name: "Oignon nouveau", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170005", measures: { gramsPerPiece: 15 }, measuresSource: "USDA 170005 « 1 medium = 15 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 7 },
  { slug: "gingembre", name: "Gingembre frais", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169231", measures: { gramsPerTsp: 2 }, measuresSource: "USDA 169231 « 1 tsp = 2 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 30 },
  { slug: "persil", name: "Persil frais", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "170416", measures: { gramsPerTbsp: 3.8 }, measuresSource: "USDA 170416 « 1 tbsp = 3,8 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "basilic", name: "Basilic frais", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "172232", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 5 },
  { slug: "coriandre", name: "Coriandre fraîche", aisle: "fruits_legumes", purchaseUnit: "g", fdcId: "169997", measures: {}, allergens: [], animalOrigin: "none", shelfLifeDays: 5 },

  // Épicerie & condiments
  { slug: "huile-olive", name: "Huile d'olive", aisle: "epicerie", purchaseUnit: "ml", fdcId: "171413", measures: { gramsPerMl: 13.5 / 15, gramsPerTbsp: 13.5, gramsPerTsp: 4.5 }, measuresSource: "USDA 171413 « 1 tablespoon = 13,5 g ; 1 tsp = 4,5 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 540 },
  { slug: "lait-de-coco", name: "Lait de coco", aisle: "epicerie", purchaseUnit: "ml", fdcId: "170173", measures: { gramsPerMl: 226 / CUP_ML }, measuresSource: "USDA 170173 « 1 cup = 226 g »", allergens: [], animalOrigin: "none", shelfLifeDays: 540 },
  { slug: "sauce-soja", name: "Sauce soja", aisle: "epicerie", purchaseUnit: "ml", fdcId: "174278", measures: { gramsPerMl: 18 / 15, gramsPerTbsp: 18, gramsPerTsp: 6 }, measuresSource: "USDA 174278 « 1 tbsp = 18 g ; 1 tsp = 6 g »", allergens: ["soy"], animalOrigin: "none", isStaple: true, shelfLifeDays: 540 },
  { slug: "miel", name: "Miel", aisle: "epicerie", purchaseUnit: "g", fdcId: "169640", measures: { gramsPerTbsp: 21 }, measuresSource: "USDA 169640 « 1 tbsp = 21 g »", allergens: [], animalOrigin: "honey", isStaple: true, shelfLifeDays: 730 },
  { slug: "moutarde", name: "Moutarde", aisle: "epicerie", purchaseUnit: "g", fdcId: "326698", measures: { gramsPerTsp: 6 }, measuresSource: "USDA 326698 « 1 teaspoon = 6 g »", allergens: ["mustard"], animalOrigin: "none", isStaple: true, shelfLifeDays: 365 },
  { slug: "curry-poudre", name: "Curry en poudre", aisle: "epicerie", purchaseUnit: "g", fdcId: "170924", measures: { gramsPerTsp: 2, gramsPerTbsp: 6.3 }, measuresSource: "USDA 170924 « 1 tsp = 2 g ; 1 tbsp = 6,3 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 730 },
  { slug: "cumin", name: "Cumin", aisle: "epicerie", purchaseUnit: "g", fdcId: "170923", measures: { gramsPerTsp: 2.1, gramsPerTbsp: 6 }, measuresSource: "USDA 170923 « 1 tsp = 2,1 g ; 1 tbsp = 6 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 730 },
  { slug: "paprika", name: "Paprika", aisle: "epicerie", purchaseUnit: "g", fdcId: "171329", measures: { gramsPerTsp: 2.3, gramsPerTbsp: 6.8 }, measuresSource: "USDA 171329 « 1 tsp = 2,3 g ; 1 tbsp = 6,8 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 730 },
  { slug: "sel", name: "Sel", aisle: "epicerie", purchaseUnit: "g", fdcId: "173468", measures: { gramsPerTsp: 6, gramsPerTbsp: 18 }, measuresSource: "USDA 173468 « 1 tsp = 6 g ; 1 tbsp = 18 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 3650 },
  { slug: "poivre", name: "Poivre noir moulu", aisle: "epicerie", purchaseUnit: "g", fdcId: "170931", measures: { gramsPerTsp: 2.3, gramsPerTbsp: 6.9 }, measuresSource: "USDA 170931 « 1 tsp, ground = 2,3 g »", allergens: [], animalOrigin: "none", isStaple: true, shelfLifeDays: 1095 },
];

type UsdaFood = (typeof usda.foods)[keyof typeof usda.foods];

function usdaFood(fdcId: string): UsdaFood {
  const food = (usda.foods as Record<string, UsdaFood>)[fdcId];
  if (!food) throw new Error(`Aliment USDA ${fdcId} absent de data/reference/usda-subset.json`);
  return food;
}

export function compositionFromUsda(fdcId: string): FoodComposition {
  const food = usdaFood(fdcId);
  const quality: DataQuality = "VERIFIED";
  return {
    per100g: food.per100g,
    source: food.source as CompositionSource,
    sourceRef: food.fdcId,
    sourceLabel: food.sourceLabel,
    sourceVersion: food.sourceVersion,
    quality,
  };
}

function cookedYield(seed: IngredientSeed): number | null {
  if (!seed.cookedYieldFrom) return null;
  const raw = usdaFood(seed.cookedYieldFrom.raw).per100g.energyKcal;
  const cooked = usdaFood(seed.cookedYieldFrom.cooked).per100g.energyKcal;
  if (!raw || !cooked) return null;
  return Math.round((raw / cooked) * 100) / 100;
}

/** Stable ids so that seeds, tests and the database agree. */
export function ingredientId(slug: string): string {
  return `ing_${slug}`;
}

export function buildSeedIngredients(): Ingredient[] {
  return INGREDIENT_SEEDS.map((seed) => ({
    id: ingredientId(seed.slug),
    slug: seed.slug,
    name: seed.name,
    aisle: seed.aisle,
    purchaseUnit: seed.purchaseUnit,
    measures: seed.measures,
    composition: compositionFromUsda(seed.fdcId),
    allergens: seed.allergens,
    animalOrigin: seed.animalOrigin,
    isPork: seed.isPork ?? false,
    containsAlcohol: false,
    isStaple: seed.isStaple ?? false,
    shelfLifeDays: seed.shelfLifeDays,
    cookedYield: cookedYield(seed),
    proteinFamily: seed.proteinFamily ?? null,
    pieceLabel: seed.pieceLabel ?? null,
  }));
}
