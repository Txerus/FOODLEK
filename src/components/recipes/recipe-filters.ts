/** Recipe list filters, shared by the page (reads ?filtre=) and the client list. */
export type Filter = "all" | "main" | "quick" | "vegetarian" | "fish" | "protein" | "cheap" | "breakfast" | "dessert" | "snack";

export const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "main", label: "Plats" },
  { value: "quick", label: "Moins de 30 min" },
  { value: "vegetarian", label: "Végétariennes" },
  { value: "fish", label: "Poisson" },
  { value: "protein", label: "Protéinées" },
  { value: "cheap", label: "Économiques" },
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "dessert", label: "Desserts" },
  { value: "snack", label: "Goûters" },
];

export function isRecipeFilter(value: unknown): value is Filter {
  return FILTERS.some((f) => f.value === value);
}
