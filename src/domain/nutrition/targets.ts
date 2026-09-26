import type { MealType } from "../catalog/types";
import {
  ACTIVITY_LABELS,
  DEFAULT_NUTRITION_CONFIG,
  KCAL_PER_GRAM,
  type ActivityLevel,
  type Appetite,
  type Goal,
  type NutritionConfig,
} from "./config";

export const SEXES = ["male", "female", "unspecified"] as const;
export type Sex = (typeof SEXES)[number];

export const SPECIAL_SITUATIONS = [
  "pregnancy",
  "breastfeeding",
  "eating_disorder",
  "medical_diet",
  "medical_followup",
] as const;
export type SpecialSituation = (typeof SPECIAL_SITUATIONS)[number];

export const SPECIAL_SITUATION_LABELS: Record<SpecialSituation, string> = {
  pregnancy: "Grossesse",
  breastfeeding: "Allaitement",
  eating_disorder: "Trouble du comportement alimentaire (actuel ou passé)",
  medical_diet: "Régime prescrit pour une pathologie",
  medical_followup: "Autre situation nécessitant un suivi médical",
};

export interface MemberProfile {
  id: string;
  name: string;
  /** "detailed" uses body measurements; "simplified" only uses appetite. */
  mode: "detailed" | "simplified";
  sex: Sex | null;
  birthYear: number | null;
  heightCm: number | null;
  weightKg: number | null;
  activity: ActivityLevel;
  goal: Goal;
  highProtein: boolean;
  appetite: Appetite;
  specialSituations: SpecialSituation[];
}

export type TargetMode = "calculated" | "simplified" | "protected";

export interface NutritionTargets {
  mode: TargetMode;
  /** Whether numbers (kcal, grams) should be displayed to the user at all. */
  showNumbers: boolean;
  /** Daily targets. Null when the mode does not compute them. */
  energyKcal: number | null;
  proteinG: number | null;
  fatG: number | null;
  carbsG: number | null;
  fiberG: number;
  restingKcal: number | null;
  maintenanceKcal: number | null;
  /** Effective goal after guardrails (a weight-loss goal can be neutralised). */
  effectiveGoal: Goal;
  warnings: string[];
  explanation: string[];
}

export function ageFromBirthYear(birthYear: number, today: Date): number {
  return today.getFullYear() - birthYear;
}

/**
 * Mifflin-St Jeor equation (Mifflin et al., Am J Clin Nutr 1990;51:241-7).
 * For an unspecified sex we use the mean of both equations and say so.
 */
export function restingEnergyMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return base + 5;
  if (sex === "female") return base - 161;
  return base - 78;
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

const PROTECTED_MESSAGES: Record<SpecialSituation, string> = {
  pregnancy:
    "Pendant la grossesse, les besoins changent et doivent être suivis par un professionnel de santé. Nous ne calculons pas d'objectif calorique et adaptons les portions à l'appétit.",
  breastfeeding:
    "Pendant l'allaitement, les besoins augmentent. Nous ne proposons aucune restriction et adaptons les portions à l'appétit ; parlez-en à votre sage-femme ou médecin.",
  eating_disorder:
    "Nous n'affichons ni calories ni objectifs chiffrés pour ce profil. Les portions suivent simplement l'appétit. Un accompagnement professionnel reste la meilleure aide.",
  medical_diet:
    "Un régime médical doit être défini par un professionnel de santé. FOODLEK ne remplace pas ce suivi : les portions suivent l'appétit, sans objectif chiffré.",
  medical_followup:
    "Votre situation nécessite un avis médical. Les portions suivent l'appétit, sans objectif chiffré.",
};

function simplifiedTargets(
  profile: MemberProfile,
  config: NutritionConfig,
  mode: TargetMode,
  warnings: string[],
  explanation: string[],
): NutritionTargets {
  const hideNumbers = profile.specialSituations.includes("eating_disorder");
  return {
    mode,
    showNumbers: !hideNumbers,
    energyKcal: null,
    proteinG: null,
    fatG: null,
    carbsG: null,
    fiberG: config.fiberGramsPerDay,
    restingKcal: null,
    maintenanceKcal: null,
    effectiveGoal: mode === "protected" ? "none" : profile.goal === "lose" ? "none" : profile.goal,
    warnings,
    explanation,
  };
}

export function computeTargets(
  profile: MemberProfile,
  today: Date,
  config: NutritionConfig = DEFAULT_NUTRITION_CONFIG,
): NutritionTargets {
  const warnings: string[] = [];
  const explanation: string[] = [];

  const age = profile.birthYear !== null ? ageFromBirthYear(profile.birthYear, today) : null;

  if (profile.specialSituations.length > 0) {
    for (const s of profile.specialSituations) warnings.push(PROTECTED_MESSAGES[s]);
    return simplifiedTargets(profile, config, "protected", warnings, [
      "Profil protégé : portions adaptées à l'appétit, sans restriction calorique.",
    ]);
  }

  if (age !== null && age < 18) {
    warnings.push(
      "Les besoins des moins de 18 ans dépendent de la croissance. Nous ne calculons pas d'objectif calorique et n'appliquons jamais de restriction : les portions suivent l'appétit.",
    );
    return simplifiedTargets(profile, config, "protected", warnings, [
      "Profil mineur : portions adaptées à l'appétit, sans objectif de perte de poids.",
    ]);
  }

  const hasBody =
    profile.mode === "detailed" &&
    profile.weightKg !== null &&
    profile.heightCm !== null &&
    age !== null &&
    profile.sex !== null;

  if (!hasBody) {
    if (profile.goal === "lose") {
      warnings.push("Un objectif de perte de poids nécessite le poids, la taille, l'âge et le sexe physiologique. Sans ces informations, les portions suivent l'appétit.");
    }
    return simplifiedTargets(profile, config, "simplified", warnings, [
      "Profil simplifié : portions estimées d'après l'appétit déclaré.",
    ]);
  }

  // Narrowed by hasBody.
  const weight = profile.weightKg as number;
  const height = profile.heightCm as number;
  const sex = profile.sex as Sex;
  const years = age as number;

  const resting = restingEnergyMifflin(sex, weight, height, years);
  const factor = config.activityFactors[profile.activity];
  const maintenance = resting * factor;
  explanation.push(
    `Dépense au repos estimée (Mifflin-St Jeor) : ${Math.round(resting)} kcal/jour.`,
    `Avec une activité « ${ACTIVITY_LABELS[profile.activity].label.toLowerCase()} » (×${factor}) : ${Math.round(maintenance)} kcal/jour pour maintenir le poids.`,
  );
  if (sex === "unspecified") {
    warnings.push("Sexe physiologique non précisé : l'estimation utilise la moyenne des deux équations et peut s'écarter de ±80 kcal.");
  }

  let energy = maintenance;
  let effectiveGoal: Goal = profile.goal;
  const currentBmi = bmi(weight, height);

  if (profile.goal === "lose") {
    if (currentBmi < 18.5) {
      effectiveGoal = "maintain";
      warnings.push("L'IMC calculé est inférieur à 18,5 : nous n'appliquons pas de déficit. Parlez-en à un professionnel de santé.");
    } else {
      const deficit = Math.min(maintenance * config.loss.deficitRatio, config.loss.maxDeficitKcal);
      const floor = Math.max(resting, sex === "female" ? config.loss.minKcalFemale : config.loss.minKcalMale);
      energy = Math.max(maintenance - deficit, floor);
      explanation.push(
        `Objectif perte de poids : déficit modéré de ${Math.round(maintenance - energy)} kcal/jour (plafonné à ${config.loss.maxDeficitKcal} kcal, jamais sous ${Math.round(floor)} kcal).`,
      );
    }
  } else if (profile.goal === "gain") {
    const surplus = Math.min(maintenance * config.gain.surplusRatio, config.gain.maxSurplusKcal);
    energy = maintenance + surplus;
    explanation.push(`Objectif prise de masse : surplus modéré de ${Math.round(surplus)} kcal/jour.`);
  }

  // Protein, computed on an adjusted weight above a BMI threshold.
  const referenceWeight =
    currentBmi > config.protein.adjustAboveBmi ? config.protein.referenceBmi * (height / 100) ** 2 : weight;
  let perKg = config.protein.defaultPerKg;
  if (effectiveGoal === "lose") perKg = config.protein.lossPerKg;
  if (effectiveGoal === "performance" || effectiveGoal === "gain") perKg = config.protein.performancePerKg;
  if (profile.highProtein) perKg = Math.max(perKg, config.protein.highPerKg);
  perKg = Math.min(perKg, config.protein.maxPerKg);
  const protein = perKg * referenceWeight;
  explanation.push(
    `Protéines : ${perKg.toLocaleString("fr-FR")} g/kg${referenceWeight !== weight ? " (poids de référence ajusté)" : ""}, soit ${Math.round(protein)} g/jour.`,
  );

  const fat = (energy * config.fatEnergyRatio) / KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, (energy - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat) / KCAL_PER_GRAM.carbs);

  return {
    mode: "calculated",
    showNumbers: true,
    energyKcal: Math.round(energy),
    proteinG: Math.round(protein),
    fatG: Math.round(fat),
    carbsG: Math.round(carbs),
    fiberG: config.fiberGramsPerDay,
    restingKcal: Math.round(resting),
    maintenanceKcal: Math.round(maintenance),
    effectiveGoal,
    warnings,
    explanation,
  };
}

export interface MealTarget {
  /** Null for simplified/protected profiles without an energy target. */
  energyKcal: number;
  proteinG: number | null;
  /** True when the energy value comes from the appetite convention, not a calculation. */
  estimated: boolean;
}

export function mealTarget(
  profile: MemberProfile,
  targets: NutritionTargets,
  mealType: MealType,
  config: NutritionConfig = DEFAULT_NUTRITION_CONFIG,
): MealTarget {
  const share = config.mealShares[mealType];
  if (targets.energyKcal === null) {
    const mainShare = config.mealShares.lunch;
    return {
      energyKcal: (config.simplifiedMainMealKcal[profile.appetite] * share) / mainShare,
      proteinG: null,
      estimated: true,
    };
  }
  return {
    energyKcal: targets.energyKcal * share,
    proteinG: targets.proteinG === null ? null : targets.proteinG * share,
    estimated: false,
  };
}
