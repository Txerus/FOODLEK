"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AccessDeniedError, getCurrentUser } from "../auth/access";
import { db } from "../db/client";
import * as t from "../db/schema";
import { invalidateCatalog } from "../services/catalog";
import { runAction, UserFacingError, type ActionResult } from "./result";

/** Chooses one of the proposed photos for a recipe (back-office only). */
export async function chooseRecipePhotoAction(raw: unknown): Promise<ActionResult> {
  return runAction("chooseRecipePhoto", async () => {
    const { recipeId, src } = z.object({ recipeId: z.string().min(1).max(100), src: z.string().url().nullable() }).parse(raw);
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") throw new AccessDeniedError("Réservé à l'administration.");
    const rows = await db().select({ candidates: t.recipes.imageCandidates }).from(t.recipes).where(eq(t.recipes.id, recipeId)).limit(1);
    if (!rows[0]) throw new UserFacingError("Recette inconnue.");
    if (src === null) {
      await db().update(t.recipes).set({ imageUrl: null, imageCredit: null, imageSourceUrl: null }).where(eq(t.recipes.id, recipeId));
    } else {
      // Only a proposed photo can be chosen (never an arbitrary URL).
      const photo = (rows[0].candidates ?? []).find((c) => c.src === src);
      if (!photo) throw new UserFacingError("Cette photo ne fait pas partie des propositions.");
      await db().update(t.recipes).set({ imageUrl: photo.src, imageCredit: photo.credit, imageSourceUrl: photo.sourceUrl }).where(eq(t.recipes.id, recipeId));
    }
    invalidateCatalog();
    revalidatePath("/", "layout");
    return { data: undefined, message: src ? "Photo choisie." : "Photo retirée : l'illustration est utilisée." };
  });
}
