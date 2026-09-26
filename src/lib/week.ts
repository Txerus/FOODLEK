import { parisNow } from "./time";

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the week containing `date`, using the calendar day in Paris. */
export function weekStartFor(date: Date): string {
  const d = new Date(`${parisNow(date).date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  return isoDate(d);
}

/**
 * The week to plan: the current one on weekdays, next week from Saturday
 * (when most households prepare their weekly shopping).
 */
export function planningWeekStart(now: Date): string {
  const current = weekStartFor(now);
  const weekday = (new Date(`${parisNow(now).date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return weekday >= 5 ? addDays(current, 7) : current;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}
