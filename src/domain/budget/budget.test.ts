import { describe, expect, it } from "vitest";
import { freshnessOf, worstQuality } from "../common/data-quality";
import { formatEuros, pricePerKiloCents } from "../common/money";
import { budgetLimitCents, summarizeBudget, type BudgetInput } from "./budget";

const base: BudgetInput = {
  budgetCents: 8500,
  mode: "target",
  basketCents: 8263,
  mealCount: 12,
  personMealCount: 24,
  dayCount: 7,
  missingPriceCount: 0,
  quality: "DEMO",
};

describe("summarizeBudget", () => {
  it("computes margin and per-unit costs", () => {
    const s = summarizeBudget(base);
    expect(s.marginCents).toBe(237);
    expect(s.status).toBe("under");
    expect(s.perPersonPerMealCents).toBe(Math.round(8263 / 24));
    expect(s.perMealCents).toBe(Math.round(8263 / 12));
    expect(s.perDayCents).toBe(Math.round(8263 / 7));
    expect(formatEuros(s.marginCents)).toBe("2,37 €");
  });

  it("accepts a small overflow in target mode", () => {
    const s = summarizeBudget({ ...base, basketCents: 8800 });
    expect(s.status).toBe("within_tolerance");
    expect(s.requiresValidation).toBe(false);
  });

  it("requires validation in strict mode", () => {
    const s = summarizeBudget({ ...base, mode: "strict", basketCents: 8600 });
    expect(s.status).toBe("within_tolerance");
    expect(s.requiresValidation).toBe(true);
  });

  it("marks partial totals", () => {
    expect(summarizeBudget({ ...base, missingPriceCount: 2 }).partial).toBe(true);
  });

  it("computes limits per mode", () => {
    expect(budgetLimitCents(9000, "strict")).toBe(9000);
    expect(budgetLimitCents(9000, "target")).toBe(9450);
    expect(budgetLimitCents(9000, "nutrition_first")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("data quality", () => {
  it("keeps the worst quality", () => {
    expect(worstQuality(["LIVE", "DEMO", "RECENT"])).toBe("DEMO");
    expect(worstQuality(["VERIFIED", "MISSING"])).toBe("MISSING");
    expect(worstQuality([])).toBe("MISSING");
  });

  it("derives freshness from retrieval time", () => {
    const now = new Date("2026-09-28T18:42:00Z");
    expect(freshnessOf(new Date("2026-09-28T18:10:00Z"), now)).toBe("LIVE");
    expect(freshnessOf(new Date("2026-09-28T08:00:00Z"), now)).toBe("VERY_RECENT");
    expect(freshnessOf(new Date("2026-09-24T08:00:00Z"), now)).toBe("RECENT");
    expect(freshnessOf(new Date("2026-09-01T08:00:00Z"), now)).toBe("OLD");
    expect(freshnessOf(null, now)).toBe("UNAVAILABLE");
  });

  it("computes unit prices", () => {
    expect(pricePerKiloCents(89, 500)).toBe(178);
    expect(pricePerKiloCents(89, 0)).toBeNull();
  });
});
