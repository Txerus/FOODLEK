/** Calendar date and hour in Europe/Paris (the product is France-first). */
export function parisNow(now = new Date()): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

const MEAL_END_HOUR = { breakfast: 10, lunch: 14, snack: 17, dinner: 22 } as const;

/** True when the meal is still ahead (or in progress) at the given Paris time. */
export function isUpcoming(slotDate: string, mealType: keyof typeof MEAL_END_HOUR, now = parisNow()): boolean {
  if (slotDate > now.date) return true;
  if (slotDate < now.date) return false;
  return now.hour < MEAL_END_HOUR[mealType];
}
