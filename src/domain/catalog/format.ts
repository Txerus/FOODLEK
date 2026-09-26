import { formatQuantity, type Unit } from "../units/units";
import type { Ingredient } from "./types";

const numberFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

/** "de" or "d'" before a word, following French elision rules (approximation on the first letter). */
export function partitive(word: string): string {
  return /^[aeiouyhœéèêàâîïôûAEIOUYHŒÉÈÊÀÂÎÏÔÛ]/.test(word) ? "d'" : "de ";
}

/** "3 œufs", "110 g de pain", "1 c. à soupe d'huile d'olive". */
export function formatIngredientAmount(
  quantity: number,
  unit: Unit,
  ingredient: Pick<Ingredient, "name" | "pieceLabel">,
): string {
  const name = ingredient.name.charAt(0).toLowerCase() + ingredient.name.slice(1);
  if (unit === "piece") {
    const label = ingredient.pieceLabel ? (quantity > 1 ? ingredient.pieceLabel.many : ingredient.pieceLabel.one) : name;
    return `${numberFormatter.format(quantity)} ${label}`;
  }
  return `${formatQuantity(quantity, unit)} ${partitive(name)}${name}`;
}

/** Quantity only, with the piece noun when relevant: "3 œufs", "110 g". */
export function formatAmountOnly(
  quantity: number,
  unit: Unit,
  ingredient: Pick<Ingredient, "pieceLabel">,
): string {
  if (unit === "piece") {
    const label = ingredient.pieceLabel ? (quantity > 1 ? ingredient.pieceLabel.many : ingredient.pieceLabel.one) : "";
    return `${numberFormatter.format(quantity)}${label ? ` ${label}` : ""}`;
  }
  return formatQuantity(quantity, unit);
}
