import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/foodlek/page-header";
import { PersonAvatar } from "@/components/foodlek/person";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { GOAL_LABELS } from "@/domain/nutrition/config";
import { computeTargets } from "@/domain/nutrition/targets";
import { requireHousehold } from "@/server/auth/access";
import { loadHouseholdContext } from "@/server/services/households";

export const metadata: Metadata = { title: "Nutrition" };

export default async function NutritionPage() {
  const { householdId } = await requireHousehold();
  const ctx = await loadHouseholdContext(householdId);
  const today = new Date();
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Nutrition : besoins estimés"
        description="Repères calculés par des formules publiées, pour ajuster les portions. Ce ne sont pas des prescriptions."
      />
      <Alert>
        <InfoIcon aria-hidden />
        <AlertDescription>
          Les estimations de FOODLEK sont générales et ne remplacent pas l'avis d'un médecin ou d'un diététicien. FOODLEK n'établit aucun diagnostic.
        </AlertDescription>
      </Alert>
      <ul className="grid gap-4 lg:grid-cols-2">
        {ctx.members.map((m, i) => {
          const t = computeTargets(m.profile, today);
          return (
            <li key={m.id} className="surface flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <PersonAvatar name={m.displayName} index={i} />
                <div>
                  <h2 className="font-semibold">{m.displayName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {t.mode === "calculated" ? "Profil détaillé" : t.mode === "simplified" ? "Profil simplifié" : "Profil protégé"} · {GOAL_LABELS[t.effectiveGoal]}
                  </p>
                </div>
              </div>
              {t.showNumbers && t.energyKcal !== null ? (
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Énergie", `${t.energyKcal.toLocaleString("fr-FR")} kcal`],
                    ["Protéines", `${t.proteinG} g`],
                    ["Lipides", `${t.fatG} g`],
                    ["Glucides", `${t.carbsG} g`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-muted/60 p-3">
                      <dt className="text-xs text-muted-foreground">{label} / jour</dt>
                      <dd className="font-display text-xl font-semibold tabular">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">Portions adaptées à l'appétit déclaré, sans objectif chiffré.</p>
              )}
              {t.weightPlan && t.showNumbers ? (
                <div className="rounded-lg bg-basil-soft p-3 text-sm">
                  <p className="font-medium">
                    {t.weightPlan.currentKg} kg → {t.weightPlan.targetKg} kg
                  </p>
                  <p className="text-muted-foreground">
                    Environ {t.weightPlan.weeklyChangeKg.toLocaleString("fr-FR")} kg par semaine, soit {t.weightPlan.projectedWeeks} semaines estimées
                    {t.weightPlan.requestedWeeks ? ` (souhaité : ${t.weightPlan.requestedWeeks} semaines)` : ""}.
                  </p>
                </div>
              ) : null}
              {t.explanation.length > 0 && t.showNumbers ? (
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {t.explanation.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                  <li>Fibres : repère de {t.fiberG} g par jour (ANSES).</li>
                </ul>
              ) : null}
              {t.warnings.map((w) => (
                <p key={w} className="rounded-lg bg-saffron-soft p-3 text-sm text-saffron-ink">
                  {w}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
      <section className="flex flex-col gap-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Méthode</h2>
        <p>
          Dépense au repos : équation de Mifflin-St Jeor (1990), multipliée par un facteur d'activité. Perte de poids : déficit de 15 % au plus, plafonné à 500 kcal/jour et jamais sous la dépense de repos ni sous 1 200 kcal (femmes) / 1 500 kcal (hommes). Protéines : 1 g/kg par défaut, 1,6 g/kg sur demande, calculées sur un poids de référence au-delà d'un IMC de 30. Lipides : 35 % de l'énergie (repère ANSES 35–40 %). Chaque repas planifié vise sa part de la journée (déjeuner et dîner : 35 % chacun).
        </p>
        <p>
          Valeurs nutritionnelles des aliments : <Link href="/sources" className="underline underline-offset-4">sources des données</Link>.{" "}
          <Link href="/household?section=profiles" className="underline underline-offset-4">Modifier les profils</Link>
        </p>
      </section>
    </div>
  );
}
