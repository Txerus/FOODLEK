import { formatEuros } from "@/domain/common/money";

export { formatEuros };

const dayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const shortDayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
const weekdayFormatter = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDay(iso: string): string {
  return capitalize(dayFormatter.format(new Date(`${iso}T12:00:00Z`)));
}

export function formatShortDay(iso: string): string {
  return capitalize(shortDayFormatter.format(new Date(`${iso}T12:00:00Z`)));
}

export function formatWeekday(iso: string): string {
  return capitalize(weekdayFormatter.format(new Date(`${iso}T12:00:00Z`)));
}

export function formatDateTime(d: Date): string {
  return dateTimeFormatter.format(d);
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m.toString().padStart(2, "0")}` : `${h} h`;
}

export function formatKcal(kcal: number): string {
  return `${Math.round(kcal).toLocaleString("fr-FR")} kcal`;
}

export function formatGrams(g: number): string {
  return `${Math.round(g).toLocaleString("fr-FR")} g`;
}
