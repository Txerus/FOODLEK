import { describe, expect, it } from "vitest";
import { alex, camille, TODAY } from "@/test/fixtures";
import { DEFAULT_NUTRITION_CONFIG } from "./config";
import { computeTargets, mealTarget, restingEnergyMifflin, type MemberProfile } from "./targets";

describe("restingEnergyMifflin", () => {
  it("matches the published equation", () => {
    // 10×90 + 6.25×180 − 5×28 + 5
    expect(restingEnergyMifflin("male", 90, 180, 28)).toBe(1890);
    // 10×60 + 6.25×165 − 5×27 − 161
    expect(restingEnergyMifflin("female", 60, 165, 27)).toBeCloseTo(1335.25);
  });
});

describe("computeTargets", () => {
  it("applies a moderate, capped deficit for weight loss", () => {
    const t = computeTargets(alex, TODAY);
    expect(t.mode).toBe("calculated");
    expect(t.maintenanceKcal).toBe(Math.round(1890 * 1.55));
    // 15 % of 2929.5 = 439 kcal, below the 500 kcal cap.
    expect(t.energyKcal).toBe(Math.round(2929.5 - 2929.5 * 0.15));
    expect(t.proteinG).toBe(144); // 1.6 g/kg × 90 kg
    expect(t.effectiveGoal).toBe("lose");
  });

  it("keeps maintenance for a maintenance goal", () => {
    const t = computeTargets(camille, TODAY);
    expect(t.energyKcal).toBe(Math.round(restingEnergyMifflin("female", 60, 165, 27) * 1.375));
    expect(t.proteinG).toBe(60);
    const sum = (t.proteinG ?? 0) * 4 + (t.fatG ?? 0) * 9 + (t.carbsG ?? 0) * 4;
    expect(Math.abs(sum - (t.energyKcal ?? 0))).toBeLessThan(15);
  });

  it("never goes below the floor", () => {
    const small: MemberProfile = { ...camille, weightKg: 48, heightCm: 152, activity: "sedentary", goal: "lose" };
    const t = computeTargets(small, TODAY);
    expect(t.energyKcal).toBeGreaterThanOrEqual(DEFAULT_NUTRITION_CONFIG.loss.minKcalFemale);
    expect(t.energyKcal).toBeGreaterThanOrEqual(t.restingKcal ?? 0);
  });

  it("refuses a deficit when BMI is below 18.5", () => {
    const thin: MemberProfile = { ...camille, weightKg: 47, heightCm: 170, goal: "lose" };
    const t = computeTargets(thin, TODAY);
    expect(t.effectiveGoal).toBe("maintain");
    expect(t.energyKcal).toBe(t.maintenanceKcal);
    expect(t.warnings.join(" ")).toMatch(/18,5/);
  });

  it("computes protein on an adjusted weight above BMI 30", () => {
    const heavy: MemberProfile = { ...alex, weightKg: 130 };
    const t = computeTargets(heavy, TODAY);
    const reference = 25 * 1.8 * 1.8;
    expect(t.proteinG).toBe(Math.round(1.6 * reference));
  });

  it("protects pregnancy: no calorie target, no deficit", () => {
    const t = computeTargets({ ...camille, goal: "lose", specialSituations: ["pregnancy"] }, TODAY);
    expect(t.mode).toBe("protected");
    expect(t.energyKcal).toBeNull();
    expect(t.effectiveGoal).toBe("none");
    expect(t.warnings[0]).toMatch(/professionnel de santé/);
  });

  it("hides numbers for eating disorders", () => {
    const t = computeTargets({ ...camille, specialSituations: ["eating_disorder"] }, TODAY);
    expect(t.showNumbers).toBe(false);
    expect(t.energyKcal).toBeNull();
  });

  it("never applies weight loss to a minor", () => {
    const teen: MemberProfile = { ...alex, birthYear: 2011, goal: "lose" };
    const t = computeTargets(teen, TODAY);
    expect(t.mode).toBe("protected");
    expect(t.effectiveGoal).toBe("none");
  });

  it("falls back to appetite for a simplified profile", () => {
    const t = computeTargets({ ...camille, mode: "simplified", weightKg: null, heightCm: null }, TODAY);
    expect(t.mode).toBe("simplified");
    expect(t.energyKcal).toBeNull();
  });

  it("flags an unspecified sex", () => {
    const t = computeTargets({ ...camille, sex: "unspecified" }, TODAY);
    expect(t.mode).toBe("calculated");
    expect(t.warnings.join(" ")).toMatch(/non précisé/);
  });
});

describe("target weight and timeframe", () => {
  it("slows down an unsafe pace and projects a realistic duration", () => {
    const t = computeTargets({ ...alex, targetWeightKg: 80, goalWeeks: 12 }, TODAY);
    expect(t.weightPlan?.dailyDeltaKcal).toBe(-750);
    expect(t.weightPlan?.slowedDown).toBe(true);
    expect(t.weightPlan?.projectedWeeks).toBe(Math.ceil(10 / ((750 * 7) / 7700)));
    expect(t.warnings.join(" ")).toMatch(/rythme sûr/);
    expect(t.energyKcal).toBe(Math.round(1890 * 1.55 - 750));
  });

  it("follows a gentle requested pace", () => {
    const t = computeTargets({ ...alex, targetWeightKg: 80, goalWeeks: 52 }, TODAY);
    expect(t.weightPlan?.slowedDown).toBe(false);
    expect(t.weightPlan?.dailyDeltaKcal).toBe(-Math.round((10 * 7700) / (52 * 7)));
    expect(t.weightPlan?.projectedWeeks).toBeGreaterThanOrEqual(51);
  });

  it("never targets a BMI below 18.5", () => {
    const t = computeTargets({ ...camille, goal: "lose", targetWeightKg: 45, goalWeeks: 52 }, TODAY);
    expect(t.weightPlan?.targetKg).toBe(Math.ceil(18.5 * 1.65 * 1.65));
    expect(t.warnings.join(" ")).toMatch(/IMC inférieur à 18,5/);
  });

  it("plans a moderate weight gain", () => {
    const t = computeTargets({ ...camille, goal: "gain", targetWeightKg: 64, goalWeeks: 8 }, TODAY);
    expect(t.weightPlan?.dailyDeltaKcal).toBeGreaterThan(0);
    expect(t.weightPlan?.slowedDown).toBe(true);
  });
});

describe("mealTarget", () => {
  it("splits the daily target by meal", () => {
    const t = computeTargets(alex, TODAY);
    const m = mealTarget(alex, t, "dinner");
    expect(m.energyKcal).toBeCloseTo((t.energyKcal ?? 0) * 0.35);
    expect(m.estimated).toBe(false);
  });

  it("uses the appetite convention when no target is computed", () => {
    const p: MemberProfile = { ...camille, mode: "simplified", appetite: "large" };
    const m = mealTarget(p, computeTargets(p, TODAY), "lunch");
    expect(m.energyKcal).toBe(DEFAULT_NUTRITION_CONFIG.simplifiedMainMealKcal.large);
    expect(m.proteinG).toBeNull();
    expect(m.estimated).toBe(true);
  });
});
