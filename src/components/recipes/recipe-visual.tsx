import Image from "next/image";
import recipeImages from "../../../data/recipe-images.json";
import { createRng, hashString } from "@/domain/common/rng";
import type { IngredientRole, Recipe } from "@/domain/catalog/types";
import { cn } from "@/lib/utils";

/**
 * Recipe visual. A real photo is used when one is registered in
 * data/recipe-images.json (with its credit); otherwise an original
 * illustration is drawn from the recipe's own ingredients: a plate seen from
 * above, split between the protein, the starch and the vegetables, in the
 * colours of those foods. No third-party image is used without rights.
 */

interface ImageEntry {
  src: string;
  alt: string;
  credit: string;
}

const IMAGES = (recipeImages as { images: Record<string, ImageEntry> }).images;

/** Food colours for the illustration (presentation only). */
const FOOD_COLORS: Record<string, string> = {
  "blanc-de-poulet": "#e9c79a",
  "escalope-de-dinde": "#e7c49b",
  "boeuf-hache-5": "#8a4b34",
  "pave-de-saumon": "#f08a62",
  "dos-de-cabillaud": "#f4ede2",
  "thon-au-naturel": "#c9a88a",
  oeuf: "#f6c945",
  "pois-chiches": "#dcae6a",
  "haricots-rouges": "#8e2f2c",
  "lentilles-corail": "#e8814d",
  "tofu-ferme": "#f1e6cf",
  "riz-long": "#f7f3ea",
  pates: "#f0d488",
  "semoule-couscous": "#e8cf8f",
  quinoa: "#e9dcc0",
  "pommes-de-terre": "#e9c46a",
  "patate-douce": "#e5894a",
  "tortilla-ble": "#ecd6a4",
  baguette: "#d9a45a",
  courgette: "#6a9b4b",
  carotte: "#ee8c36",
  "poivron-rouge": "#d8432f",
  tomate: "#e0482f",
  "tomates-concassees": "#c93a28",
  "epinards-surgeles": "#2f6b3a",
  brocoli: "#3d7f3f",
  "haricots-verts-surgeles": "#4f8a3c",
  "champignons-de-paris": "#cbb49a",
  concombre: "#9cc27a",
  "salade-verte": "#7fb65a",
  poireau: "#b9d38d",
  "chou-fleur": "#f3ecd8",
  "petits-pois-surgeles": "#7cb342",
  aubergine: "#5b3a6b",
  "mais-doux": "#f4cf3a",
  avocat: "#9bbf55",
  feta: "#fbf8f0",
  mozzarella: "#fdfbf5",
  "yaourt-grec-0": "#fbfaf6",
  "cuisse-de-poulet": "#d9a066",
  "jambon-blanc": "#f2b8b0",
  lardons: "#c9695a",
  crevettes: "#f39a7b",
  "sardines-huile": "#9aa3a8",
  bavette: "#7d3b2a",
  "filet-mignon-porc": "#e8b8a0",
  "lentilles-vertes": "#6b6a3a",
  "haricots-blancs": "#efe6d2",
  "yaourt-nature": "#fbfaf6",
  ricotta: "#faf6ee",
  "chevre-frais": "#f8f5ee",
  "flocons-avoine": "#dcc79a",
  farine: "#f4ecdc",
  boulgour: "#d4b47a",
  "nouilles-de-riz": "#f3eee2",
  "riz-rond": "#f7f3ea",
  polenta: "#f2cf5b",
  "pain-complet": "#a9774a",
  "pain-de-mie": "#e9cf9d",
  "pate-feuilletee": "#e6b86a",
  "epinards-frais": "#3d7a3a",
  butternut: "#f0a04b",
  "chou-blanc": "#dfe8c8",
  "betterave-cuite": "#8a1e3c",
  radis: "#d9455f",
  "olives-noires": "#3b3337",
  pomme: "#d6493a",
  banane: "#f3d35b",
  poire: "#c9d36a",
  orange: "#f39b2d",
  kiwi: "#8db34a",
  fraises: "#e0364a",
  myrtilles: "#4a4f8f",
  "framboises-surgelees": "#d63a5c",
  mangue: "#f6b13a",
  "chocolat-noir": "#4a2c20",
  noix: "#a7784a",
  "beurre-cacahuete": "#b9803f",
  "graines-chia": "#5b5750",
  "coco-rapee": "#fbf8f1",
  "raisins-secs": "#5e3a3a",
};

const BACKDROPS = ["#f4ead8", "#eef0e2", "#f6e3d7", "#e8efe9", "#f3ecdf", "#efe7ee"];

function colorsFor(recipe: Recipe, role: IngredientRole): string[] {
  return recipe.ingredients
    .filter((ri) => ri.role === role)
    .map((ri) => FOOD_COLORS[ri.ingredientId.replace(/^ing_/, "")])
    .filter((c): c is string => Boolean(c));
}

function wedge(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${p(a0)} A ${r} ${r} 0 ${large} 1 ${p(a1)} Z`;
}

function backdropFor(recipe: Recipe): string {
  return BACKDROPS[hashString(`${recipe.slug}:backdrop`) % BACKDROPS.length];
}

function Illustration({ recipe }: { recipe: Recipe }) {
  const rng = createRng(hashString(recipe.slug));
  const protein = colorsFor(recipe, "protein");
  const starch = colorsFor(recipe, "starch");
  const veg = colorsFor(recipe, "vegetable");
  const garnish = colorsFor(recipe, "garnish");
  // Desserts: chocolate, nuts… carry the dish, so they get their own part of the plate.
  const fat = colorsFor(recipe, "fat");
  const groups = [
    { colors: starch, weight: 1 },
    { colors: protein, weight: 1 },
    { colors: veg, weight: 1.2 },
    { colors: fat, weight: 0.8 },
  ].filter((g) => g.colors.length > 0);
  const total = groups.reduce((s, g) => s + g.weight, 0) || 1;
  const start = rng() * Math.PI * 2;
  const cx = 200;
  const cy = 150;
  const r = 96;

  let angle = start;
  const shapes: React.ReactNode[] = [];
  groups.forEach((g, gi) => {
    const span = (g.weight / total) * Math.PI * 2;
    // A single group fills the whole plate (an arc from a point to itself draws nothing).
    shapes.push(
      groups.length === 1 ? (
        <circle key={`w${gi}`} cx={cx} cy={cy} r={r} fill={g.colors[0]} />
      ) : (
        <path key={`w${gi}`} d={wedge(cx, cy, r, angle, angle + span)} fill={g.colors[0]} />
      ),
    );
    // Texture: pieces of the other foods of the group, scattered inside the wedge.
    const count = 10 + Math.floor(rng() * 8);
    for (let k = 0; k < count; k++) {
      const a = angle + 0.15 + rng() * (span - 0.3);
      const d = 18 + rng() * (r - 28);
      const color = g.colors[k % g.colors.length];
      const size = 4 + rng() * 7;
      shapes.push(
        <ellipse
          key={`p${gi}-${k}`}
          cx={cx + d * Math.cos(a)}
          cy={cy + d * Math.sin(a)}
          rx={size}
          ry={size * (0.55 + rng() * 0.4)}
          transform={`rotate(${Math.round(rng() * 180)} ${cx + d * Math.cos(a)} ${cy + d * Math.sin(a)})`}
          fill={color}
          opacity={0.85}
          stroke="#00000014"
        />,
      );
    }
    angle += span;
  });
  const herbs = garnish.length ? garnish : ["#4f8a3c"];
  for (let k = 0; k < 9; k++) {
    const a = rng() * Math.PI * 2;
    const d = rng() * (r - 20);
    shapes.push(
      <circle key={`h${k}`} cx={cx + d * Math.cos(a)} cy={cy + d * Math.sin(a)} r={2 + rng() * 2} fill={herbs[k % herbs.length]} opacity={0.9} />,
    );
  }

  return (
    <svg viewBox="0 0 400 300" role="img" aria-label={`Illustration : ${recipe.title}`} className="size-full" preserveAspectRatio="xMidYMid meet">
            <ellipse cx={cx + 8} cy={cy + 12} rx={r + 30} ry={r + 26} fill="#0000000d" />
      <circle cx={cx} cy={cy} r={r + 24} fill="#fffdf8" />
      <circle cx={cx} cy={cy} r={r + 24} fill="none" stroke="#00000010" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r + 4} fill="#f7f3ea" />
      <g>{shapes}</g>
      <path d={`M ${cx + r + 60} 40 q 6 90 0 220`} stroke="#c9bfae" strokeWidth="7" strokeLinecap="round" fill="none" opacity={0.7} />
    </svg>
  );
}

export function RecipeVisual({
  recipe,
  className,
  priority = false,
  creditLink = false,
  sizes = "(min-width: 1024px) 33vw, 100vw",
}: {
  recipe: Recipe;
  className?: string;
  priority?: boolean;
  /** Link the credit to the photo's page (not inside a card that is itself a link). */
  creditLink?: boolean;
  sizes?: string;
}) {
  // A photo chosen in the back-office (Pexels) comes first, then a local photo.
  const photo: (ImageEntry & { sourceUrl?: string | null }) | undefined = recipe.imageUrl
    ? { src: recipe.imageUrl, alt: recipe.title, credit: recipe.imageCredit ?? "", sourceUrl: recipe.imageSourceUrl ?? null }
    : IMAGES[recipe.slug];
  return (
    <div
      className={cn("relative aspect-[4/3] overflow-hidden rounded-xl bg-muted", className)}
      style={photo ? undefined : { backgroundColor: backdropFor(recipe) }}
    >
      {photo ? (
        <>
          <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover" priority={priority} />
          {photo.credit ? (
            creditLink && photo.sourceUrl ? (
              <a
                href={photo.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 bottom-2 rounded bg-black/45 px-1.5 py-0.5 text-[0.625rem] text-white hover:underline"
              >
                {photo.credit}
              </a>
            ) : (
              <span className="absolute right-2 bottom-2 rounded bg-black/45 px-1.5 py-0.5 text-[0.625rem] text-white">{photo.credit}</span>
            )
          ) : null}
        </>
      ) : (
        <Illustration recipe={recipe} />
      )}
    </div>
  );
}
