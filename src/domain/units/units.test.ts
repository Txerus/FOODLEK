import { describe, expect, it } from "vitest";
import {
  formatQuantity,
  gramsToPurchaseUnit,
  roundForKitchen,
  toGrams,
  UnitConversionError,
} from "./units";

const oil = { gramsPerMl: 0.9, gramsPerTbsp: 13.5, gramsPerTsp: 4.5 };
const egg = { gramsPerPiece: 50 };

describe("toGrams", () => {
  it("handles mass units", () => {
    expect(toGrams(250, "g", {})).toBe(250);
    expect(toGrams(1.2, "kg", {})).toBe(1200);
  });

  it("uses density for volumes", () => {
    expect(toGrams(100, "ml", oil)).toBeCloseTo(90);
    expect(toGrams(2, "cl", { gramsPerMl: 1 })).toBeCloseTo(20);
    expect(toGrams(1, "l", { gramsPerMl: 1.04 })).toBeCloseTo(1040);
  });

  it("prefers direct spoon weights over density", () => {
    expect(toGrams(2, "tbsp", oil)).toBeCloseTo(27);
    expect(toGrams(1, "tsp", oil)).toBeCloseTo(4.5);
    expect(toGrams(1, "tsp", { gramsPerTbsp: 6.3 })).toBeCloseTo(2.1);
    expect(toGrams(1, "tbsp", { gramsPerMl: 1 })).toBeCloseTo(15);
  });

  it("uses piece weight", () => {
    expect(toGrams(3, "piece", egg)).toBe(150);
  });

  it("refuses conversions without reference data", () => {
    expect(() => toGrams(1, "piece", {})).toThrow(UnitConversionError);
    expect(() => toGrams(10, "ml", {})).toThrow(/densité inconnue/);
  });
});

describe("gramsToPurchaseUnit", () => {
  it("converts back to the unit a product is sold in", () => {
    expect(gramsToPurchaseUnit(150, "piece", egg)).toBe(3);
    expect(gramsToPurchaseUnit(90, "ml", oil)).toBeCloseTo(100);
    expect(gramsToPurchaseUnit(42, "g", {})).toBe(42);
  });
});

describe("roundForKitchen", () => {
  it("rounds weights to measurable steps", () => {
    expect(roundForKitchen(7.4, "g")).toBe(7);
    expect(roundForKitchen(42, "g")).toBe(40);
    expect(roundForKitchen(137, "g")).toBe(140);
    expect(roundForKitchen(0, "g")).toBe(0);
  });

  it("rounds pieces and spoons to halves, quarters below one, with a minimum", () => {
    expect(roundForKitchen(1.3, "piece")).toBe(1.5);
    expect(roundForKitchen(0.1, "piece")).toBe(0.25);
    expect(roundForKitchen(0.4, "piece")).toBe(0.5);
    expect(roundForKitchen(0.8, "tbsp")).toBe(0.75);
  });
});

describe("formatQuantity", () => {
  it("formats in French", () => {
    expect(formatQuantity(1500, "g")).toBe("1,5 kg");
    expect(formatQuantity(250, "ml")).toBe("250 ml");
    expect(formatQuantity(2, "tbsp")).toBe("2 c. à soupe");
    expect(formatQuantity(2, "piece")).toBe("2");
  });
});
