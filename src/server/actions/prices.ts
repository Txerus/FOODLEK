"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { householdForAction } from "../auth/access";
import { setManualPrice } from "../services/offers";
import { assertWithinLimit } from "../rate-limit";
import { runAction, UserFacingError, type ActionResult } from "./result";

const input = z.object({
  ingredientId: z.string().min(1).max(100),
  priceEuros: z.number().min(0.01, "Indiquez un prix").max(500),
  // At least 1 g / 1 ml / 0,1 pièce: a tiny quantity would give an absurd price per kg.
  packQuantity: z.number().min(0.1, "Indiquez la quantité du paquet").max(100_000),
  packUnit: z.enum(["g", "ml", "piece"]),
}).refine((v) => v.packUnit === "piece" || v.packQuantity >= 1, { path: ["packQuantity"], message: "Au moins 1 g ou 1 ml" });

const UNIT_LABEL = { g: "g", ml: "ml", piece: "pièce(s)" } as const;

/** Price typed in by the household for an ingredient without a known price. */
export async function setManualPriceAction(raw: unknown): Promise<ActionResult> {
  return runAction("setManualPrice", async () => {
    const data = input.parse(raw);
    const { householdId } = await householdForAction();
    await assertWithinLimit("manualPrice", householdId);
    try {
      await setManualPrice(householdId, {
        ingredientId: data.ingredientId,
        priceCents: Math.round(data.priceEuros * 100),
        packQuantity: data.packQuantity,
        packUnit: data.packUnit,
        packLabel: `${data.packQuantity} ${UNIT_LABEL[data.packUnit]}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "NO_STORE") throw new UserFacingError("Choisissez d'abord un magasin (Magasins et prix).");
      if (error instanceof Error && error.message === "UNKNOWN_INGREDIENT") throw new UserFacingError("Ingrédient inconnu.");
      throw error;
    }
    revalidatePath("/", "layout");
    return { data: undefined, message: "Prix enregistré. Le total des courses est mis à jour." };
  });
}
