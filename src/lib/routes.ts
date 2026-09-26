export function recipeHref(slug: string, slotKey?: string): string {
  return slotKey ? `/recipes/${slug}?repas=${encodeURIComponent(slotKey)}` : `/recipes/${slug}`;
}

export function cookHref(slug: string, slotKey?: string): string {
  return slotKey ? `/recipes/${slug}/cuisine?repas=${encodeURIComponent(slotKey)}` : `/recipes/${slug}/cuisine`;
}
