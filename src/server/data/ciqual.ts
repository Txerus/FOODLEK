import type { NutrientsPer100g } from "@/domain/nutrition/nutrients";

/**
 * Parser for the ANSES-Ciqual XML distribution (alim_*.xml, compo_*.xml).
 * Pure functions, so they can be tested without the 70 MB files.
 *
 * Constituent codes (Ciqual documentation):
 *  328   Énergie, Règlement UE N° 1169/2011 (kcal/100 g)
 *  25000 Protéines, N x facteur de Jones (g/100 g)
 *  31000 Glucides (g/100 g)
 *  40000 Lipides (g/100 g)
 *  34100 Fibres alimentaires (g/100 g)
 *  32000 Sucres (g/100 g)
 *  40302 AG saturés (g/100 g)
 *  10110 Sodium (mg/100 g)
 */
export const CIQUAL_CONSTITUENTS: Record<string, keyof NutrientsPer100g> = {
  "328": "energyKcal",
  "25000": "proteinG",
  "31000": "carbsG",
  "40000": "fatG",
  "34100": "fiberG",
  "32000": "sugarsG",
  "40302": "saturatedFatG",
  "10110": "sodiumMg",
};

export interface CiqualFood {
  code: string;
  nameFr: string;
}

function field(record: string, tag: string): string | null {
  const m = record.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Ciqual values are French decimals, possibly "traces", "< 0,5" or "-".
 * "traces" is a measured near-zero → 0. "<" limits and "-" are unknown → null
 * (we do not guess a value).
 */
export function parseCiqualValue(raw: string | null): number | null {
  if (raw === null) return null;
  const v = raw.trim().toLowerCase();
  if (v === "" || v === "-") return null;
  if (v === "traces") return 0;
  if (v.startsWith("<")) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseAlim(xml: string): CiqualFood[] {
  const out: CiqualFood[] = [];
  for (const m of xml.matchAll(/<ALIM>([\s\S]*?)<\/ALIM>/g)) {
    const code = field(m[1], "alim_code");
    const name = field(m[1], "alim_nom_fr");
    if (code && name) out.push({ code, nameFr: name });
  }
  return out;
}

export function parseCompo(xml: string): Map<string, NutrientsPer100g> {
  const out = new Map<string, NutrientsPer100g>();
  for (const m of xml.matchAll(/<COMPO>([\s\S]*?)<\/COMPO>/g)) {
    const constCode = field(m[1], "const_code");
    const key = constCode ? CIQUAL_CONSTITUENTS[constCode] : undefined;
    if (!key) continue;
    const alim = field(m[1], "alim_code");
    if (!alim) continue;
    const entry =
      out.get(alim) ??
      ({ energyKcal: null, proteinG: null, fatG: null, carbsG: null, fiberG: null, sugarsG: null, saturatedFatG: null, sodiumMg: null } satisfies NutrientsPer100g);
    entry[key] = parseCiqualValue(field(m[1], "teneur"));
    out.set(alim, entry);
  }
  return out;
}

/** Ciqual XML files declare windows-1252; decode accordingly. */
export function decodeXml(bytes: Uint8Array): string {
  const head = new TextDecoder("ascii").decode(bytes.slice(0, 200));
  const enc = head.match(/encoding="([^"]+)"/i)?.[1]?.toLowerCase() ?? "utf-8";
  return new TextDecoder(enc === "windows-1252" || enc === "iso-8859-1" ? "windows-1252" : "utf-8").decode(bytes);
}

function words(s: string): string[] {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

/**
 * Ciqual foods whose name is closest to an ingredient name, best first:
 * a suggestion for a person to check, never applied automatically.
 * Raw foods ("cru") are favoured, prepared dishes pushed down.
 */
export function suggestCiqualMatches(ingredientName: string, foods: readonly CiqualFood[], limit = 5): CiqualFood[] {
  const wanted = words(ingredientName).filter((w) => !["de", "du", "des", "la", "le", "les", "au", "aux", "et"].includes(w));
  if (wanted.length === 0) return [];
  const scored = foods
    .map((food) => {
      const name = words(food.nameFr);
      const hits = wanted.filter((w) => name.some((n) => n === w || n.startsWith(w) || w.startsWith(n))).length;
      if (hits === 0) return null;
      let score = hits / wanted.length - name.length * 0.01;
      if (name[0] && wanted.some((w) => name[0].startsWith(w))) score += 0.3;
      if (name.includes("cru") || name.includes("crue")) score += 0.05;
      if (name.includes("prepare") || name.includes("plat")) score -= 0.2;
      return { food, score };
    })
    .filter((x): x is { food: CiqualFood; score: number } => x !== null)
    .sort((a, b) => b.score - a.score || a.food.nameFr.localeCompare(b.food.nameFr, "fr"));
  return scored.slice(0, limit).map((x) => x.food);
}

export interface CiqualMappingEntry {
  code: string;
  /** Exact Ciqual name checked by a person: the link is refused if the table says otherwise. */
  name: string;
}

/** Whether a verified mapping still points at the food it was checked against. */
export function mappingMatches(entry: CiqualMappingEntry, food: CiqualFood | undefined): boolean {
  return food !== undefined && food.nameFr.trim().toLowerCase() === entry.name.trim().toLowerCase();
}
