/**
 * How each FOODLEK ingredient is found among real products in Open Prices.
 * Tags come from the Open Food Facts category taxonomy
 * (openfoodfacts-server/taxonomies/food/categories.txt, checked 27/09/2026).
 *
 *  - productTags: categories of packaged products (with a barcode);
 *  - looseTags: categories used for loose fruit and vegetables priced per kg
 *    or per unit (Open Prices "category" prices);
 *  - excludeTags / excludeWords / requireWords: filters on the product's
 *    categories and name, to keep only products that really are the ingredient;
 *  - drained: the recipe quantity is a drained weight; a canned product is only
 *    kept when its label states the drained weight (never guessed).
 */

export interface ObservedPriceSpec {
  productTags: string[];
  looseTags?: string[];
  excludeTags?: string[];
  excludeWords?: string[];
  requireWords?: string[];
  drained?: boolean;
  /** Shown when the product is an equivalent rather than the exact ingredient. */
  substitution?: string;
}

const NOT_FRESH = ["en:frozen-foods", "en:canned-foods", "en:cooked-vegetables", "en:prepared-vegetables"];

export const OBSERVED_PRICE_SPECS: Record<string, ObservedPriceSpec> = {
  "blanc-de-poulet": { productTags: ["en:chicken-breasts"], excludeTags: ["en:marinated-chicken-breasts"], excludeWords: ["pane", "marine", "cuit", "roti", "fume", "nugget"] },
  "escalope-de-dinde": { productTags: ["en:turkey-cutlets"], excludeTags: ["en:breaded-turkey-cutlets"], excludeWords: ["pane", "milanaise", "viennoise", "cordon"] },
  "boeuf-hache-5": { productTags: ["en:minced-beef-steak-with-5-fat"], excludeTags: ["en:cooked-minced-beef-steak-with-5-fat"] },
  "pave-de-saumon": { productTags: ["en:salmon-steaks"], excludeWords: ["fume"] },
  "dos-de-cabillaud": { productTags: ["en:cod-fillets"], excludeWords: ["pane", "brandade", "sauce"] },
  "thon-au-naturel": { productTags: ["en:tunas-in-brine"], drained: true },
  oeuf: { productTags: ["en:chicken-eggs"], excludeTags: ["en:frozen-chicken-eggs"] },
  "pois-chiches": { productTags: ["en:chickpeas"], excludeTags: ["en:dried-chickpeas", "en:salty-roasted-chickpeas", "en:chocolate-coated-chickpeas", "en:frozen-chickpeas"], drained: true },
  "haricots-rouges": { productTags: ["en:canned-red-kidney-beans", "en:cooked-red-kidney-beans"], drained: true },
  "lentilles-corail": { productTags: ["en:decorticated-red-lentils", "en:dried-pink-lentils"] },
  "tofu-ferme": { productTags: ["en:plain-tofu"], excludeTags: ["en:silken-tofu", "en:smoked-tofu", "en:fried-tofu"], excludeWords: ["soyeux"] },
  "yaourt-grec-0": { productTags: ["en:greek-style-yogurts-plain"], requireWords: ["0%", "0 %"] },
  feta: { productTags: ["en:feta"], excludeWords: ["huile"] },
  mozzarella: { productTags: ["en:mozzarella"], excludeTags: ["en:grated-mozzarella", "en:sliced-mozzarellas"] },
  "parmesan-rape": { productTags: ["en:parmigiano-reggiano"], requireWords: ["rape"] },
  "gruyere-rape": { productTags: ["en:grated-emmentaler"], substitution: "Emmental râpé à la place du gruyère râpé" },
  "creme-legere": { productTags: ["en:fermented-creams"], requireWords: ["legere", "allegee", "15%", "15 %"] },
  "lait-demi-ecreme": { productTags: ["en:semi-skimmed-milks"], excludeTags: ["en:semi-skimmed-milk-with-reduced-lactose"] },
  beurre: { productTags: ["en:unsalted-butters"], excludeTags: ["en:light-butter"] },
  "riz-long": { productTags: ["en:long-grain-rices"], excludeWords: ["cuisson rapide", "express", "micro-ondes", "poche"] },
  pates: { productTags: ["en:dry-durum-wheat-pasta"], excludeTags: ["en:dried-wholemeal-pasta", "en:dry-egg-pastas", "en:stuffed-pastas"], excludeWords: ["complete", "sans gluten", "lentille", "pois"] },
  "semoule-couscous": { productTags: ["en:durum-wheat-semolinas-for-couscous"], excludeTags: ["en:prepared-couscous"] },
  quinoa: { productTags: ["en:quinoa"], excludeTags: ["en:puffed-quinoa", "en:unsalted-boiled-quinoa"], excludeWords: ["cuit", "express", "poelee", "gourmand"] },
  "pommes-de-terre": { productTags: ["en:potatoes"], looseTags: ["en:potatoes"], excludeTags: [...NOT_FRESH, "en:frozen-fried-potatoes"] },
  "patate-douce": { productTags: ["en:sweet-potatoes"], looseTags: ["en:sweet-potatoes"], excludeTags: NOT_FRESH },
  "tortilla-ble": { productTags: ["en:wheat-flatbreads"] },
  baguette: { productTags: ["en:baguettes"], excludeTags: ["en:frozen-baguettes"] },
  courgette: { productTags: ["en:zucchini"], looseTags: ["en:zucchini"], excludeTags: [...NOT_FRESH, "en:prepared-zucchini"] },
  carotte: { productTags: ["en:carrots"], looseTags: ["en:carrots"], excludeTags: [...NOT_FRESH, "en:grated-carrots"] },
  oignon: { productTags: ["en:onions"], looseTags: ["en:onions"], excludeTags: [...NOT_FRESH, "en:fried-onions", "en:dried-onions", "en:pickled-onions"] },
  ail: { productTags: ["en:garlics"], looseTags: ["en:garlics"], excludeTags: [...NOT_FRESH, "en:garlic-powders", "en:wild-garlic"] },
  "poivron-rouge": { productTags: ["en:red-bell-peppers"], looseTags: ["en:red-bell-peppers"], excludeTags: NOT_FRESH },
  tomate: { productTags: ["en:tomatoes"], looseTags: ["en:tomatoes"], excludeTags: NOT_FRESH },
  "tomates-concassees": { productTags: ["en:tomato-pulps"], substitution: "Pulpe de tomates" },
  "concentre-de-tomate": { productTags: ["en:tomato-pastes"] },
  "epinards-surgeles": { productTags: ["en:frozen-chopped-spinachs"], excludeWords: ["creme"] },
  brocoli: { productTags: ["en:broccoli"], looseTags: ["en:broccoli"], excludeTags: NOT_FRESH },
  "haricots-verts-surgeles": { productTags: ["en:frozen-green-beans"] },
  "champignons-de-paris": { productTags: ["en:champignon-mushrooms"], looseTags: ["en:champignon-mushrooms"], excludeTags: [...NOT_FRESH, "en:canned-champignon-mushrooms"] },
  concombre: { productTags: ["en:cucumbers"], looseTags: ["en:cucumbers"], excludeTags: NOT_FRESH },
  "salade-verte": { productTags: ["en:lettuces"], looseTags: ["en:lettuces"] },
  poireau: { productTags: ["en:leeks"], looseTags: ["en:leeks"], excludeTags: NOT_FRESH },
  "chou-fleur": { productTags: ["en:cauliflowers"], looseTags: ["en:cauliflowers"], excludeTags: NOT_FRESH },
  "petits-pois-surgeles": { productTags: ["en:frozen-green-peas"], excludeWords: ["carotte"] },
  aubergine: { productTags: ["en:aubergines"], looseTags: ["en:aubergines"], excludeTags: [...NOT_FRESH, "en:pickled-eggplants"] },
  "mais-doux": { productTags: ["en:canned-sweet-corn"], drained: true },
  avocat: { productTags: ["en:avocados"], looseTags: ["en:avocados"], excludeTags: ["en:frozen-avocados"] },
  citron: { productTags: ["en:lemons"], looseTags: ["en:lemons"], excludeTags: ["en:dried-lemons"] },
  "oignon-nouveau": { productTags: ["en:scallions"] },
  gingembre: { productTags: ["en:fresh-ginger-rhizomes"], looseTags: ["en:ginger"], excludeTags: ["en:ginger-powder", "en:crystallized-ginger"] },
  persil: { productTags: ["en:fresh-parsley"] },
  basilic: { productTags: ["en:fresh-basils"] },
  coriandre: { productTags: ["en:fresh-coriander-leaves"] },
  "huile-olive": { productTags: ["en:olive-oils"], excludeTags: ["en:flavoured-olive-oils"] },
  "lait-de-coco": { productTags: ["en:coconut-milks"] },
  "sauce-soja": { productTags: ["en:soy-sauces"] },
  miel: { productTags: ["en:honeys"] },
  moutarde: { productTags: ["en:dijon-mustards"] },
  "curry-poudre": { productTags: ["en:curry-powders"] },
  cumin: { productTags: ["en:ground-cumin-seeds"] },
  paprika: { productTags: ["en:paprika"] },
  sel: { productTags: ["en:salts"] },
  poivre: { productTags: ["en:ground-black-peppers"] },
};
