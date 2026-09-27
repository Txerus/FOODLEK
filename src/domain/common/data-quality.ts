/**
 * Data quality levels. Every figure shown to the user carries one of these,
 * so that DEMO or ESTIMATED values are never presented as verified store data.
 *
 * Ordered from most to least trustworthy; `worstQuality` relies on this order.
 */
export const DATA_QUALITY = ["VERIFIED", "LIVE", "RECENT", "ESTIMATED", "DEMO", "MISSING"] as const;
export type DataQuality = (typeof DATA_QUALITY)[number];

export const DATA_QUALITY_LABELS: Record<DataQuality, string> = {
  VERIFIED: "Vérifié",
  LIVE: "En direct",
  RECENT: "Récent",
  ESTIMATED: "Estimé",
  DEMO: "Démo",
  MISSING: "Indisponible",
};

export const DATA_QUALITY_EXPLANATIONS: Record<DataQuality, string> = {
  VERIFIED: "Donnée issue d'une source de référence identifiée et versionnée.",
  LIVE: "Donnée récupérée auprès de la source il y a moins d'une heure.",
  RECENT: "Donnée récupérée récemment auprès de la source, peut avoir changé depuis.",
  ESTIMATED: "Valeur calculée ou approchée : elle n'est pas garantie par une source.",
  DEMO: "Donnée fictive de démonstration. Elle ne correspond à aucune enseigne réelle.",
  MISSING: "Aucune donnée fiable disponible pour cet élément.",
};

export function worstQuality(qualities: readonly DataQuality[]): DataQuality {
  let worstIndex = 0;
  for (const q of qualities) {
    const i = DATA_QUALITY.indexOf(q);
    if (i > worstIndex) worstIndex = i;
  }
  return qualities.length === 0 ? "MISSING" : DATA_QUALITY[worstIndex];
}

/** Freshness of a store price, derived from its retrieval timestamp. */
export const FRESHNESS = ["LIVE", "VERY_RECENT", "RECENT", "OLD", "UNAVAILABLE"] as const;
export type Freshness = (typeof FRESHNESS)[number];

export const FRESHNESS_LABELS: Record<Freshness, string> = {
  LIVE: "Live",
  VERY_RECENT: "Très récent",
  RECENT: "Récent",
  OLD: "Ancien",
  UNAVAILABLE: "Indisponible",
};

export interface FreshnessThresholds {
  liveMs: number;
  veryRecentMs: number;
  recentMs: number;
}

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = {
  liveMs: 60 * 60 * 1000,
  veryRecentMs: 24 * 60 * 60 * 1000,
  recentMs: 7 * 24 * 60 * 60 * 1000,
};

export function freshnessOf(
  fetchedAt: Date | null,
  now: Date,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS_THRESHOLDS,
): Freshness {
  if (!fetchedAt) return "UNAVAILABLE";
  const age = now.getTime() - fetchedAt.getTime();
  // A date in the future (clock skew, bad data) is not trusted as fresh.
  if (age < -5 * 60_000) return "OLD";
  if (age <= thresholds.liveMs) return "LIVE";
  if (age <= thresholds.veryRecentMs) return "VERY_RECENT";
  if (age <= thresholds.recentMs) return "RECENT";
  return "OLD";
}
