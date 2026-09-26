import { describe, expect, it } from "vitest";
import { isUpcoming, parisNow } from "./time";
import { addDays, planningWeekStart, weekStartFor } from "./week";

describe("week helpers", () => {
  it("uses the Paris calendar day", () => {
    // Sunday 27 Sept 2026, 00:30 in Paris = Saturday 22:30 UTC.
    const d = new Date("2026-09-26T22:30:00Z");
    expect(parisNow(d).date).toBe("2026-09-27");
    expect(weekStartFor(d)).toBe("2026-09-21");
  });

  it("plans the current week on weekdays and next week from Saturday", () => {
    expect(planningWeekStart(new Date("2026-09-23T10:00:00Z"))).toBe("2026-09-21");
    expect(planningWeekStart(new Date("2026-09-26T10:00:00Z"))).toBe("2026-09-28");
    expect(planningWeekStart(new Date("2026-09-27T10:00:00Z"))).toBe("2026-09-28");
    expect(planningWeekStart(new Date("2026-09-28T06:00:00Z"))).toBe("2026-09-28");
  });

  it("adds days across months", () => {
    expect(addDays("2026-09-28", 6)).toBe("2026-10-04");
  });

  it("knows which meals are still ahead", () => {
    const now = { date: "2026-09-23", hour: 15 };
    expect(isUpcoming("2026-09-23", "lunch", now)).toBe(false);
    expect(isUpcoming("2026-09-23", "dinner", now)).toBe(true);
    expect(isUpcoming("2026-09-22", "dinner", now)).toBe(false);
    expect(isUpcoming("2026-09-24", "breakfast", now)).toBe(true);
  });
});
