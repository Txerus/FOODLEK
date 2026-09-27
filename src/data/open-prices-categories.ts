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
  "blanc-de-poulet": {
    productTags: ["en:chicken-breasts"],
    excludeTags: ["en:marinated-chicken-breasts"],
    excludeWords: ["pane", "marine", "cuit", "roti", "fume", "nugget"],
  },
  "escalope-de-dinde": {
    productTags: ["en:turkey-cutlets"],
    excludeTags: ["en:breaded-turkey-cutlets"],
    excludeWords: ["pane", "milanaise", "viennoise", "cordon"],
  },
  "boeuf-hache-5": { productTags: ["en:minced-beef-steak-with-5-fat"], excludeTags: ["en:cooked-minced-beef-steak-with-5-fat"] },
  "pave-de-saumon": { productTags: ["en:salmon-steaks"], excludeWords: ["fume"] },
  "dos-de-cabillaud": { productTags: ["en:cod-fillets"], excludeWords: ["pane", "brandade", "sauce"] },
  "thon-au-naturel": { productTags: ["en:tunas-in-brine"], drained: true },
  oeuf: { productTags: ["en:chicken-eggs"], excludeTags: ["en:frozen-chicken-eggs"] },
  "pois-chiches": {
    productTags: ["en:chickpeas"],
    excludeTags: ["en:dried-chickpeas", "en:salty-roasted-chickpeas", "en:chocolate-coated-chickpeas", "en:frozen-chickpeas"],
    drained: true,
  },
  "haricots-rouges": { productTags: ["en:canned-red-kidney-beans", "en:cooked-red-kidney-beans"], drained: true },
  "lentilles-corail": { productTags: ["en:decorticated-red-lentils", "en:dried-pink-lentils"] },
  "tofu-ferme": {
    productTags: ["en:plain-tofu"],
    excludeTags: ["en:silken-tofu", "en:smoked-tofu", "en:fried-tofu"],
    excludeWords: ["soyeux"],
  },
  "yaourt-grec-0": { productTags: ["en:greek-style-yogurts-plain"], requireWords: ["0%", "0 %"] },
  feta: { productTags: ["en:feta"], excludeWords: ["huile"] },
  mozzarella: { productTags: ["en:mozzarella"], excludeTags: ["en:grated-mozzarella", "en:sliced-mozzarellas"] },
  "parmesan-rape": { productTags: ["en:parmigiano-reggiano"], requireWords: ["rape"] },
  "gruyere-rape": { productTags: ["en:grated-emmentaler"], substitution: "Emmental râpé à la place du gruyère râpé" },
  "creme-legere": { productTags: ["en:fermented-creams"], requireWords: ["legere", "allegee", "15%", "15 %"] },
  "lait-demi-ecreme": { productTags: ["en:semi-skimmed-milks"], excludeTags: ["en:semi-skimmed-milk-with-reduced-lactose"] },
  beurre: { productTags: ["en:unsalted-butters"], excludeTags: ["en:light-butter"] },
  "riz-long": { productTags: ["en:long-grain-rices"], excludeWords: ["cuisson rapide", "express", "micro-ondes", "poche"] },
  pates: {
    productTags: ["en:dry-durum-wheat-pasta"],
    excludeTags: ["en:dried-wholemeal-pasta", "en:dry-egg-pastas", "en:stuffed-pastas"],
    excludeWords: ["complete", "sans gluten", "lentille", "pois"],
  },
  "semoule-couscous": { productTags: ["en:durum-wheat-semolinas-for-couscous"], excludeTags: ["en:prepared-couscous"] },
  quinoa: {
    productTags: ["en:quinoa"],
    excludeTags: ["en:puffed-quinoa", "en:unsalted-boiled-quinoa"],
    excludeWords: ["cuit", "express", "poelee", "gourmand"],
  },
  "pommes-de-terre": {
    productTags: ["en:potatoes"],
    looseTags: ["en:potatoes"],
    excludeTags: [...NOT_FRESH, "en:frozen-fried-potatoes"],
  },
  "patate-douce": { productTags: ["en:sweet-potatoes"], looseTags: ["en:sweet-potatoes"], excludeTags: NOT_FRESH },
  "tortilla-ble": { productTags: ["en:wheat-flatbreads"] },
  baguette: { productTags: ["en:baguettes"], excludeTags: ["en:frozen-baguettes"] },
  courgette: { productTags: ["en:zucchini"], looseTags: ["en:zucchini"], excludeTags: [...NOT_FRESH, "en:prepared-zucchini"] },
  carotte: { productTags: ["en:carrots"], looseTags: ["en:carrots"], excludeTags: [...NOT_FRESH, "en:grated-carrots"] },
  oignon: {
    productTags: ["en:onions"],
    looseTags: ["en:onions"],
    excludeTags: [...NOT_FRESH, "en:fried-onions", "en:dried-onions", "en:pickled-onions"],
  },
  ail: {
    productTags: ["en:garlics"],
    looseTags: ["en:garlics"],
    excludeTags: [...NOT_FRESH, "en:garlic-powders", "en:wild-garlic"],
  },
  "poivron-rouge": { productTags: ["en:red-bell-peppers"], looseTags: ["en:red-bell-peppers"], excludeTags: NOT_FRESH },
  tomate: { productTags: ["en:tomatoes"], looseTags: ["en:tomatoes"], excludeTags: NOT_FRESH },
  "tomates-concassees": { productTags: ["en:tomato-pulps"], substitution: "Pulpe de tomates" },
  "concentre-de-tomate": { productTags: ["en:tomato-pastes"] },
  "epinards-surgeles": { productTags: ["en:frozen-chopped-spinachs"], excludeWords: ["creme"] },
  brocoli: { productTags: ["en:broccoli"], looseTags: ["en:broccoli"], excludeTags: NOT_FRESH },
  "haricots-verts-surgeles": { productTags: ["en:frozen-green-beans"] },
  "champignons-de-paris": {
    productTags: ["en:champignon-mushrooms"],
    looseTags: ["en:champignon-mushrooms"],
    excludeTags: [...NOT_FRESH, "en:canned-champignon-mushrooms"],
  },
  concombre: { productTags: ["en:cucumbers"], looseTags: ["en:cucumbers"], excludeTags: NOT_FRESH },
  "salade-verte": { productTags: ["en:lettuces"], looseTags: ["en:lettuces"] },
  poireau: { productTags: ["en:leeks"], looseTags: ["en:leeks"], excludeTags: NOT_FRESH },
  "chou-fleur": { productTags: ["en:cauliflowers"], looseTags: ["en:cauliflowers"], excludeTags: NOT_FRESH },
  "petits-pois-surgeles": { productTags: ["en:frozen-green-peas"], excludeWords: ["carotte"] },
  aubergine: {
    productTags: ["en:aubergines"],
    looseTags: ["en:aubergines"],
    excludeTags: [...NOT_FRESH, "en:pickled-eggplants"],
  },
  "mais-doux": { productTags: ["en:canned-sweet-corn"], drained: true },
  avocat: { productTags: ["en:avocados"], looseTags: ["en:avocados"], excludeTags: ["en:frozen-avocados"] },
  citron: { productTags: ["en:lemons"], looseTags: ["en:lemons"], excludeTags: ["en:dried-lemons"] },
  "oignon-nouveau": { productTags: ["en:scallions"] },
  gingembre: {
    productTags: ["en:fresh-ginger-rhizomes"],
    looseTags: ["en:ginger"],
    excludeTags: ["en:ginger-powder", "en:crystallized-ginger"],
  },
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
  // Catalogue élargi (septembre 2026)
  "cuisse-de-poulet": { productTags: ["en:chicken-thighs"], excludeWords: ["pane", "marine", "cuit", "roti"] },
  "jambon-blanc": { productTags: ["en:white-hams"], excludeWords: ["poulet", "dinde"] },
  lardons: { productTags: ["en:lardons"] },
  crevettes: {
    productTags: ["en:shrimps", "en:prawns"],
    excludeTags: ["en:cooked-shrimps"],
    excludeWords: ["cuit", "pane", "sauce"],
  },
  "sardines-huile": { productTags: ["en:sardines-in-olive-oil", "en:sardines-in-oil"], drained: true },
  bavette: { productTags: ["en:beef-flank-steak"], excludeTags: ["en:grilled-beef-flank-steak"] },
  "filet-mignon-porc": {
    productTags: ["en:pork-filet-mignon"],
    excludeTags: ["en:cooked-pork-filet-mignon", "en:smoked-pork-filet-mignon"],
  },
  // Dry lentils only: canned ones ("au naturel", drained weight) are cooked, not the composition used.
  "lentilles-vertes": {
    productTags: ["en:green-lentils"],
    excludeTags: ["en:canned-green-lentils", "en:canned-foods"],
    excludeWords: ["cuisine", "cuites", "salade", "naturel", "egoutt"],
  },
  "haricots-blancs": { productTags: ["en:white-beans"], excludeWords: ["sauce tomate", "cassoulet"], drained: true },
  "yaourt-nature": {
    productTags: ["en:plain-yogurts"],
    excludeTags: ["en:greek-style-yogurts"],
    excludeWords: ["sucre", "0%", "0 %", "grec"],
  },
  ricotta: { productTags: ["en:ricotta"] },
  "chevre-frais": { productTags: ["en:fresh-goat-cheese", "en:cheese-from-goat-s-milk-fresh"] },
  "creme-liquide": { productTags: ["en:unfermented-creams"], excludeWords: ["legere", "allegee", "15%", "12%", "vegetal"] },
  "flocons-avoine": { productTags: ["en:rolled-oats"], excludeWords: ["chocolat", "fruits"] },
  farine: {
    productTags: ["en:wheat-flours"],
    excludeTags: ["en:self-raising-wheat-flour", "en:durum-wheat-flours", "en:wheat-flour-t110", "en:wheat-flour-type-150"],
  },
  boulgour: { productTags: ["en:bulgur"], excludeTags: ["en:unsalted-cooked-wheat-bulgur", "en:bulgur-dishes"] },
  "nouilles-de-riz": {
    productTags: ["en:dried-rice-noodles", "en:rice-vermicelli"],
    excludeTags: ["en:cooked-unsalted-rice-noodles"],
  },
  "riz-rond": { productTags: ["en:short-grain-rices"] },
  polenta: { productTags: ["en:corn-semolinas-for-polenta", "en:dried-pre-cooked-polenta-semolina"] },
  "pain-complet": { productTags: ["en:wholemeal-breads"] },
  "pain-de-mie": { productTags: ["en:sliced-breads"], excludeWords: ["complet", "cereales", "brioche"] },
  "pate-feuilletee": { productTags: ["en:puff-pastry-sheets"], excludeTags: ["en:cooked-puff-pastry"] },
  "epinards-frais": { productTags: ["en:fresh-spinachs"], looseTags: ["en:spinachs"] },
  butternut: { productTags: ["en:butternut-squashes"], looseTags: ["en:butternut-squashes"], excludeTags: NOT_FRESH },
  "chou-blanc": {
    productTags: ["en:cabbages"],
    looseTags: ["en:cabbages"],
    excludeTags: NOT_FRESH,
    excludeWords: ["rouge", "choucroute"],
  },
  "betterave-cuite": { productTags: ["en:cooked-beetroots"] },
  radis: { productTags: ["en:radishes"], looseTags: ["en:radishes"] },
  "olives-noires": { productTags: ["en:black-olives"], requireWords: ["denoyaut"] },
  pomme: { productTags: ["en:apples"], looseTags: ["en:apples"], excludeTags: NOT_FRESH },
  banane: { productTags: ["en:bananas"], looseTags: ["en:bananas"], excludeTags: NOT_FRESH },
  poire: { productTags: ["en:pears"], looseTags: ["en:pears"], excludeTags: NOT_FRESH },
  orange: { productTags: ["en:oranges"], looseTags: ["en:oranges"], excludeTags: NOT_FRESH },
  kiwi: { productTags: ["en:kiwifruits"], looseTags: ["en:kiwifruits"], excludeTags: NOT_FRESH },
  fraises: { productTags: ["en:strawberries"], looseTags: ["en:strawberries"], excludeTags: NOT_FRESH },
  myrtilles: { productTags: ["en:blueberries"], looseTags: ["en:blueberries"], excludeTags: NOT_FRESH },
  "framboises-surgelees": { productTags: ["en:frozen-raspberries"] },
  mangue: { productTags: ["en:mangoes"], looseTags: ["en:mangoes"], excludeTags: NOT_FRESH },
  "citron-vert": { productTags: ["en:limes"], looseTags: ["en:limes"] },
  "raisins-secs": { productTags: ["en:raisins"] },
  sucre: { productTags: ["en:white-sugars", "en:granulated-sugars"], excludeWords: ["glace", "vanill", "canne"] },
  "chocolat-noir": { productTags: ["en:dark-chocolates"], requireWords: ["patissier", "dessert", "cuisine"] },
  "cacao-poudre": { productTags: ["en:cocoa-powders"], excludeWords: ["sucre", "instantane", "chocolat en poudre"] },
  cannelle: { productTags: ["en:cinnamon"], requireWords: ["moulue", "poudre"] },
  "poudre-amande": { productTags: ["en:ground-almonds"] },
  noix: { productTags: ["en:walnut-kernels"] },
  "beurre-cacahuete": { productTags: ["en:peanut-butters"] },
  confiture: { productTags: ["en:jams"], excludeWords: ["allege", "sans sucre"] },
  "graines-chia": { productTags: ["en:chia"] },
  "coco-rapee": { productTags: ["en:grated-coconut"] },
  thym: { productTags: ["en:dried-thyme"] },
  origan: { productTags: ["en:dried-oregano"] },
  ciboulette: { productTags: ["en:fresh-chives"] },
  menthe: { productTags: ["en:fresh-mint"] },
  muscade: { productTags: ["en:ground-nutmeg"] },
};
