import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/foodlek/brand";
import { HouseholdWizard } from "@/components/onboarding/household-wizard";
import type { WizardCatalog } from "@/components/onboarding/types";
import { DEFAULT_SETUP, householdDraftShapeSchema, type HouseholdSetup } from "@/lib/validation/household";
import { getHouseholdIdForUser, requireUser } from "@/server/auth/access";
import { getCatalog } from "@/server/services/catalog";
import { createHouseholdForUser, getOnboardingDraft, loadHouseholdContext } from "@/server/services/households";
import { listRetailers, listSelectableStores } from "@/server/services/stores";

export const metadata: Metadata = { title: "Configurer mon foyer", robots: { index: false } };

/** Restores a saved draft when it is still structurally valid, field by field. */
function restoreDraft(draft: Record<string, unknown> | null, base: HouseholdSetup): { setup: HouseholdSetup; step: number } {
  if (!draft) return { setup: base, step: 0 };
  const step = typeof draft.step === "number" ? draft.step : 0;
  const data = (draft.data ?? {}) as Record<string, unknown>;
  // An incomplete draft (e.g. a detailed profile without its weight yet) is
  // restored as long as its structure is right; the last step re-validates.
  const parsed = householdDraftShapeSchema.safeParse({ ...base, ...data });
  return parsed.success ? { setup: parsed.data, step } : { setup: base, step: 0 };
}

export default async function OnboardingPage() {
  const user = await requireUser();
  const householdId = (await getHouseholdIdForUser(user.id)) ?? (await createHouseholdForUser(user.id));
  const ctx = await loadHouseholdContext(householdId);
  if (ctx.onboardingCompleted) redirect("/dashboard");

  const [catalog, stores, retailers, draft] = await Promise.all([
    getCatalog(),
    listSelectableStores(),
    listRetailers(),
    getOnboardingDraft(householdId),
  ]);
  const demoStore = stores.find((s) => s.isDemo);
  const base: HouseholdSetup = {
    ...DEFAULT_SETUP,
    members: DEFAULT_SETUP.members.map((m, i) => (i === 0 ? { ...m, displayName: user.name } : m)),
    storeId: demoStore?.id ?? null,
    pantryIngredientIds: catalog.ingredients
      .filter((i) => ["huile-olive", "sel", "poivre"].includes(i.slug))
      .map((i) => i.id),
  };
  const { setup, step } = restoreDraft(draft, base);
  const wizardCatalog: WizardCatalog = {
    ingredients: catalog.ingredients
      .map((i) => ({ id: i.id, name: i.name, isStaple: i.isStaple }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    stores,
    retailers: retailers.filter((r) => !r.isDemo).map((r) => ({ name: r.name, status: r.status, notes: r.notes })),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 pt-5 sm:px-0">
        <BrandMark href="/onboarding" />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 sm:px-0">
        <HouseholdWizard mode="onboarding" initial={setup} initialStep={step} catalog={wizardCatalog} />
      </main>
    </div>
  );
}
