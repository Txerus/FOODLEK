import { describe, expect, it } from "vitest";
import { DEFAULT_SETUP, defaultMember, householdDraftShapeSchema, householdSetupSchema } from "./household";

describe("onboarding validation", () => {
  it("accepts the default setup", () => {
    expect(householdSetupSchema.safeParse(DEFAULT_SETUP).success).toBe(true);
  });

  it("requires body data for a detailed profile", () => {
    const res = householdSetupSchema.safeParse({ ...DEFAULT_SETUP, members: [{ ...defaultMember(0), profileMode: "detailed" }] });
    expect(res.success).toBe(false);
    const paths = res.error?.issues.map((i) => i.path.join(".")) ?? [];
    expect(paths).toEqual(expect.arrayContaining(["members.0.sex", "members.0.birthYear", "members.0.heightCm", "members.0.weightKg"]));
  });

  it("refuses a weight-loss goal for a child", () => {
    const res = householdSetupSchema.safeParse({ ...DEFAULT_SETUP, members: [{ ...defaultMember(0, true), goal: "lose" }] });
    expect(res.success).toBe(false);
  });

  it("requires at least one meal and one member", () => {
    const empty = { breakfast: [], lunch: [], dinner: [], snack: [] };
    expect(householdSetupSchema.safeParse({ ...DEFAULT_SETUP, schedule: empty }).success).toBe(false);
    expect(householdSetupSchema.safeParse({ ...DEFAULT_SETUP, members: [] }).success).toBe(false);
  });

  it("restores an incomplete draft with the right shape", () => {
    const draft = { ...DEFAULT_SETUP, members: [{ ...defaultMember(0), profileMode: "detailed" }] };
    expect(householdDraftShapeSchema.safeParse(draft).success).toBe(true);
    expect(householdDraftShapeSchema.safeParse({ ...DEFAULT_SETUP, budgetEuros: "beaucoup" }).success).toBe(false);
  });
});
