import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { PhotoPicker } from "@/components/admin/photo-picker";
import { PageHeader } from "@/components/foodlek/page-header";
import { requireAdmin } from "@/server/auth/access";
import { db } from "@/server/db/client";
import * as t from "@/server/db/schema";

export const metadata: Metadata = { title: "Photos des recettes", robots: { index: false } };

export default async function RecipePhotosPage() {
  await requireAdmin();
  const recipes = await db()
    .select({ id: t.recipes.id, title: t.recipes.title, imageUrl: t.recipes.imageUrl, candidates: t.recipes.imageCandidates })
    .from(t.recipes)
    .orderBy(asc(t.recipes.title));
  const withCandidates = recipes.filter((r) => (r.candidates ?? []).length > 0);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Photos des recettes"
        description="Photos proposées par Pexels (licence libre, usage commercial autorisé). Choisissez celle qui correspond le mieux au plat ; le photographe est crédité sur le site."
      />
      {withCandidates.length === 0 ? (
        <p className="surface p-5 text-sm text-muted-foreground">
          Aucune proposition pour l'instant. Ajoutez une clé gratuite Pexels (<code>PEXELS_API_KEY</code> dans <code>.env</code>) puis lancez <code>pnpm photos:recettes</code>.
        </p>
      ) : null}
      <ul className="flex flex-col gap-6">
        {withCandidates.map((r) => (
          <li key={r.id} className="surface flex flex-col gap-3 p-5">
            <h2 className="font-semibold">{r.title}</h2>
            <PhotoPicker recipeId={r.id} current={r.imageUrl} candidates={r.candidates ?? []} />
          </li>
        ))}
      </ul>
    </div>
  );
}
