import type { PurchaseUnit } from "@/domain/units/units";

/**
 * DEMONSTRATION CATALOGUE — FICTIONAL DATA.
 *
 * These products and prices do not come from any retailer. They exist so that
 * the application can be tried locally end to end (packs, prices, budget,
 * leftovers). Everything built from this file is stored and displayed with the
 * DEMO quality level and the fictional retailer "Épicerie Démo".
 *
 * Real prices come from RetailProviders (see src/server/retail), never from
 * this file.
 */

export const DEMO_RETAILER = {
  id: "ret_demo",
  slug: "demo",
  name: "Épicerie Démo",
  isDemo: true,
} as const;

export const DEMO_STORE = {
  id: "store_demo",
  retailerId: DEMO_RETAILER.id,
  name: "Magasin de démonstration (données fictives)",
  city: "Données fictives",
  postcode: null,
  latitude: null,
  longitude: null,
} as const;

export interface DemoProduct {
  /** Ingredient slug this product maps to. */
  ingredient: string;
  name: string;
  brand: string | null;
  packLabel: string;
  packQuantity: number;
  packUnit: PurchaseUnit;
  priceCents: number;
  isOrganic?: boolean;
  isStoreBrand?: boolean;
  substitution?: string;
}

const own = "Démo";

export const DEMO_PRODUCTS: DemoProduct[] = [
  { ingredient: "blanc-de-poulet", name: "Filets de poulet", brand: own, packLabel: "barquette 400 g", packQuantity: 400, packUnit: "g", priceCents: 549, isStoreBrand: true },
  { ingredient: "blanc-de-poulet", name: "Filets de poulet", brand: own, packLabel: "barquette 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 1190, isStoreBrand: true },
  { ingredient: "blanc-de-poulet", name: "Filets de poulet bio", brand: "Démo Bio", packLabel: "barquette 300 g", packQuantity: 300, packUnit: "g", priceCents: 699, isOrganic: true },
  { ingredient: "escalope-de-dinde", name: "Escalopes de dinde", brand: own, packLabel: "barquette 500 g", packQuantity: 500, packUnit: "g", priceCents: 649, isStoreBrand: true },
  { ingredient: "boeuf-hache-5", name: "Bœuf haché 5 % MG", brand: own, packLabel: "barquette 350 g", packQuantity: 350, packUnit: "g", priceCents: 479, isStoreBrand: true },
  { ingredient: "boeuf-hache-5", name: "Bœuf haché 5 % MG", brand: own, packLabel: "barquette 750 g", packQuantity: 750, packUnit: "g", priceCents: 949, isStoreBrand: true },
  { ingredient: "pave-de-saumon", name: "Pavés de saumon", brand: own, packLabel: "2 pavés, 250 g", packQuantity: 250, packUnit: "g", priceCents: 599, isStoreBrand: true },
  { ingredient: "pave-de-saumon", name: "Pavés de saumon", brand: own, packLabel: "4 pavés, 500 g", packQuantity: 500, packUnit: "g", priceCents: 1099, isStoreBrand: true },
  { ingredient: "dos-de-cabillaud", name: "Dos de cabillaud", brand: own, packLabel: "barquette 300 g", packQuantity: 300, packUnit: "g", priceCents: 799, isStoreBrand: true },
  { ingredient: "thon-au-naturel", name: "Thon au naturel", brand: own, packLabel: "boîte 140 g égoutté", packQuantity: 140, packUnit: "g", priceCents: 229, isStoreBrand: true },
  { ingredient: "thon-au-naturel", name: "Thon au naturel", brand: own, packLabel: "lot 3 × 112 g égoutté", packQuantity: 336, packUnit: "g", priceCents: 499, isStoreBrand: true },
  { ingredient: "oeuf", name: "Œufs plein air", brand: own, packLabel: "boîte de 6", packQuantity: 6, packUnit: "piece", priceCents: 219, isStoreBrand: true },
  { ingredient: "oeuf", name: "Œufs plein air", brand: own, packLabel: "boîte de 12", packQuantity: 12, packUnit: "piece", priceCents: 399, isStoreBrand: true },
  { ingredient: "oeuf", name: "Œufs bio", brand: "Démo Bio", packLabel: "boîte de 6", packQuantity: 6, packUnit: "piece", priceCents: 299, isOrganic: true },
  { ingredient: "pois-chiches", name: "Pois chiches", brand: own, packLabel: "boîte 265 g égoutté", packQuantity: 265, packUnit: "g", priceCents: 99, isStoreBrand: true },
  { ingredient: "haricots-rouges", name: "Haricots rouges", brand: own, packLabel: "boîte 250 g égoutté", packQuantity: 250, packUnit: "g", priceCents: 95, isStoreBrand: true },
  { ingredient: "lentilles-corail", name: "Lentilles corail", brand: own, packLabel: "sachet 500 g", packQuantity: 500, packUnit: "g", priceCents: 229, isStoreBrand: true },
  { ingredient: "tofu-ferme", name: "Tofu ferme nature", brand: "Démo Végétal", packLabel: "bloc 250 g", packQuantity: 250, packUnit: "g", priceCents: 269 },
  { ingredient: "yaourt-grec-0", name: "Yaourt à la grecque 0 %", brand: own, packLabel: "pot 500 g", packQuantity: 500, packUnit: "g", priceCents: 219, isStoreBrand: true },
  { ingredient: "feta", name: "Feta AOP", brand: own, packLabel: "200 g", packQuantity: 200, packUnit: "g", priceCents: 259, isStoreBrand: true },
  { ingredient: "mozzarella", name: "Mozzarella", brand: own, packLabel: "boule 125 g", packQuantity: 125, packUnit: "g", priceCents: 99, isStoreBrand: true },
  { ingredient: "parmesan-rape", name: "Parmesan râpé", brand: own, packLabel: "sachet 60 g", packQuantity: 60, packUnit: "g", priceCents: 189, isStoreBrand: true },
  { ingredient: "gruyere-rape", name: "Gruyère râpé", brand: own, packLabel: "sachet 200 g", packQuantity: 200, packUnit: "g", priceCents: 239, isStoreBrand: true },
  { ingredient: "creme-legere", name: "Crème épaisse légère 15 %", brand: own, packLabel: "pot 200 g", packQuantity: 200, packUnit: "g", priceCents: 119, isStoreBrand: true },
  { ingredient: "creme-legere", name: "Crème épaisse légère 15 %", brand: own, packLabel: "pot 500 g", packQuantity: 500, packUnit: "g", priceCents: 239, isStoreBrand: true },
  { ingredient: "lait-demi-ecreme", name: "Lait demi-écrémé", brand: own, packLabel: "bouteille 1 l", packQuantity: 1000, packUnit: "ml", priceCents: 109, isStoreBrand: true },
  { ingredient: "beurre", name: "Beurre doux", brand: own, packLabel: "plaquette 250 g", packQuantity: 250, packUnit: "g", priceCents: 279, isStoreBrand: true },
  { ingredient: "riz-long", name: "Riz long grain", brand: own, packLabel: "sachet 500 g", packQuantity: 500, packUnit: "g", priceCents: 139, isStoreBrand: true },
  { ingredient: "riz-long", name: "Riz long grain", brand: own, packLabel: "sachet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 219, isStoreBrand: true },
  { ingredient: "pates", name: "Penne", brand: own, packLabel: "paquet 500 g", packQuantity: 500, packUnit: "g", priceCents: 89, isStoreBrand: true },
  { ingredient: "pates", name: "Penne", brand: own, packLabel: "paquet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 159, isStoreBrand: true },
  { ingredient: "semoule-couscous", name: "Semoule moyenne", brand: own, packLabel: "paquet 500 g", packQuantity: 500, packUnit: "g", priceCents: 119, isStoreBrand: true },
  { ingredient: "quinoa", name: "Quinoa", brand: own, packLabel: "sachet 400 g", packQuantity: 400, packUnit: "g", priceCents: 299, isStoreBrand: true },
  { ingredient: "pommes-de-terre", name: "Pommes de terre", brand: null, packLabel: "filet 2,5 kg", packQuantity: 2500, packUnit: "g", priceCents: 349 },
  { ingredient: "pommes-de-terre", name: "Pommes de terre", brand: null, packLabel: "filet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 179 },
  { ingredient: "patate-douce", name: "Patate douce", brand: null, packLabel: "filet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 299 },
  { ingredient: "tortilla-ble", name: "Tortillas de blé", brand: own, packLabel: "paquet de 8", packQuantity: 8, packUnit: "piece", priceCents: 159, isStoreBrand: true },
  { ingredient: "baguette", name: "Baguette", brand: null, packLabel: "baguette 250 g", packQuantity: 250, packUnit: "g", priceCents: 99 },
  { ingredient: "courgette", name: "Courgettes", brand: null, packLabel: "filet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 249 },
  { ingredient: "courgette", name: "Courgettes", brand: null, packLabel: "barquette 500 g", packQuantity: 500, packUnit: "g", priceCents: 159 },
  { ingredient: "carotte", name: "Carottes", brand: null, packLabel: "sachet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 129 },
  { ingredient: "oignon", name: "Oignons jaunes", brand: null, packLabel: "filet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 169 },
  { ingredient: "ail", name: "Ail", brand: null, packLabel: "filet 3 têtes, 150 g", packQuantity: 150, packUnit: "g", priceCents: 159 },
  { ingredient: "poivron-rouge", name: "Poivrons rouges", brand: null, packLabel: "sachet 500 g", packQuantity: 500, packUnit: "g", priceCents: 229 },
  { ingredient: "tomate", name: "Tomates", brand: null, packLabel: "barquette 500 g", packQuantity: 500, packUnit: "g", priceCents: 199 },
  { ingredient: "tomates-concassees", name: "Tomates concassées", brand: own, packLabel: "boîte 400 g", packQuantity: 400, packUnit: "g", priceCents: 79, isStoreBrand: true },
  { ingredient: "concentre-de-tomate", name: "Concentré de tomate", brand: own, packLabel: "tube 150 g", packQuantity: 150, packUnit: "g", priceCents: 119, isStoreBrand: true },
  { ingredient: "epinards-surgeles", name: "Épinards hachés", brand: own, packLabel: "sachet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 199, isStoreBrand: true },
  { ingredient: "epinards-surgeles", name: "Épinards hachés", brand: own, packLabel: "sachet 450 g", packQuantity: 450, packUnit: "g", priceCents: 129, isStoreBrand: true },
  { ingredient: "brocoli", name: "Brocoli", brand: null, packLabel: "pièce ≈ 500 g", packQuantity: 500, packUnit: "g", priceCents: 199 },
  { ingredient: "haricots-verts-surgeles", name: "Haricots verts extra-fins", brand: own, packLabel: "sachet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 239, isStoreBrand: true },
  { ingredient: "champignons-de-paris", name: "Champignons de Paris", brand: null, packLabel: "barquette 250 g", packQuantity: 250, packUnit: "g", priceCents: 149 },
  { ingredient: "champignons-de-paris", name: "Champignons de Paris", brand: null, packLabel: "barquette 500 g", packQuantity: 500, packUnit: "g", priceCents: 259 },
  { ingredient: "concombre", name: "Concombre", brand: null, packLabel: "pièce ≈ 350 g", packQuantity: 350, packUnit: "g", priceCents: 89 },
  { ingredient: "salade-verte", name: "Salade feuille de chêne", brand: null, packLabel: "sachet 150 g", packQuantity: 150, packUnit: "g", priceCents: 129 },
  { ingredient: "poireau", name: "Poireaux", brand: null, packLabel: "botte 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 229 },
  { ingredient: "chou-fleur", name: "Chou-fleur", brand: null, packLabel: "pièce ≈ 800 g", packQuantity: 800, packUnit: "g", priceCents: 229 },
  { ingredient: "petits-pois-surgeles", name: "Petits pois", brand: own, packLabel: "sachet 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 219, isStoreBrand: true },
  { ingredient: "aubergine", name: "Aubergine", brand: null, packLabel: "pièce ≈ 350 g", packQuantity: 350, packUnit: "g", priceCents: 119 },
  { ingredient: "mais-doux", name: "Maïs doux", brand: own, packLabel: "boîte 285 g égoutté", packQuantity: 285, packUnit: "g", priceCents: 99, isStoreBrand: true },
  { ingredient: "avocat", name: "Avocat", brand: null, packLabel: "pièce", packQuantity: 1, packUnit: "piece", priceCents: 99 },
  { ingredient: "avocat", name: "Avocats", brand: null, packLabel: "filet de 3", packQuantity: 3, packUnit: "piece", priceCents: 249 },
  { ingredient: "citron", name: "Citrons", brand: null, packLabel: "filet de 4", packQuantity: 4, packUnit: "piece", priceCents: 169 },
  { ingredient: "oignon-nouveau", name: "Oignons nouveaux", brand: null, packLabel: "botte 150 g", packQuantity: 150, packUnit: "g", priceCents: 119 },
  { ingredient: "gingembre", name: "Gingembre frais", brand: null, packLabel: "morceau 100 g", packQuantity: 100, packUnit: "g", priceCents: 99 },
  { ingredient: "persil", name: "Persil plat", brand: null, packLabel: "botte 30 g", packQuantity: 30, packUnit: "g", priceCents: 99 },
  { ingredient: "basilic", name: "Basilic", brand: null, packLabel: "botte 30 g", packQuantity: 30, packUnit: "g", priceCents: 129 },
  { ingredient: "coriandre", name: "Coriandre", brand: null, packLabel: "botte 30 g", packQuantity: 30, packUnit: "g", priceCents: 99 },
  { ingredient: "huile-olive", name: "Huile d'olive vierge extra", brand: own, packLabel: "bouteille 1 l", packQuantity: 1000, packUnit: "ml", priceCents: 899, isStoreBrand: true },
  { ingredient: "huile-olive", name: "Huile d'olive vierge extra", brand: own, packLabel: "bouteille 50 cl", packQuantity: 500, packUnit: "ml", priceCents: 499, isStoreBrand: true },
  { ingredient: "lait-de-coco", name: "Lait de coco", brand: own, packLabel: "boîte 400 ml", packQuantity: 400, packUnit: "ml", priceCents: 169, isStoreBrand: true },
  { ingredient: "lait-de-coco", name: "Lait de coco", brand: own, packLabel: "brique 200 ml", packQuantity: 200, packUnit: "ml", priceCents: 109, isStoreBrand: true },
  { ingredient: "sauce-soja", name: "Sauce soja", brand: own, packLabel: "bouteille 250 ml", packQuantity: 250, packUnit: "ml", priceCents: 199, isStoreBrand: true },
  { ingredient: "miel", name: "Miel de fleurs", brand: own, packLabel: "pot 500 g", packQuantity: 500, packUnit: "g", priceCents: 449, isStoreBrand: true },
  { ingredient: "moutarde", name: "Moutarde", brand: own, packLabel: "pot 370 g", packQuantity: 370, packUnit: "g", priceCents: 149, isStoreBrand: true },
  { ingredient: "curry-poudre", name: "Curry en poudre", brand: own, packLabel: "flacon 45 g", packQuantity: 45, packUnit: "g", priceCents: 179, isStoreBrand: true },
  { ingredient: "cumin", name: "Cumin moulu", brand: own, packLabel: "flacon 40 g", packQuantity: 40, packUnit: "g", priceCents: 179, isStoreBrand: true },
  { ingredient: "paprika", name: "Paprika doux", brand: own, packLabel: "flacon 40 g", packQuantity: 40, packUnit: "g", priceCents: 169, isStoreBrand: true },
  { ingredient: "sel", name: "Sel fin", brand: own, packLabel: "boîte 1 kg", packQuantity: 1000, packUnit: "g", priceCents: 59, isStoreBrand: true },
  { ingredient: "poivre", name: "Poivre noir moulu", brand: own, packLabel: "flacon 50 g", packQuantity: 50, packUnit: "g", priceCents: 219, isStoreBrand: true },
];

/** Pantry the demo household declares: oil, salt, pepper and spices. */
export const DEMO_PANTRY_SLUGS = ["huile-olive", "sel", "poivre", "curry-poudre", "cumin", "paprika"];
