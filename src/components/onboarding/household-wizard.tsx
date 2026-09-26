"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CloudIcon, InfoIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FormProvider, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import {
  householdSetupSchema,
  type HouseholdSetup,
} from "@/lib/validation/household";
import { saveDraftAction, completeOnboardingAction, updateHouseholdAction } from "@/server/actions/household";
import { BudgetStep } from "./steps/budget-step";
import { CookingStep } from "./steps/cooking-step";
import { HouseholdStep } from "./steps/household-step";
import { MealsStep } from "./steps/meals-step";
import { PantryStep } from "./steps/pantry-step";
import { PreferencesStep } from "./steps/preferences-step";
import { ProfilesStep } from "./steps/profiles-step";
import { RecapStep } from "./steps/recap-step";
import { StoreStep } from "./steps/store-step";
import type { WizardCatalog } from "./types";

interface StepDef {
  id: string;
  title: string;
  subtitle: string;
  fields: FieldPath<HouseholdSetup>[];
}

const STEPS: StepDef[] = [
  { id: "household", title: "Votre foyer", subtitle: "Qui s'assoit à table ? Chaque personne aura son propre profil.", fields: ["householdName", "members", "generalAppetite"] },
  { id: "profiles", title: "Les profils", subtitle: "Pour adapter les portions de chacun. Seul le nécessaire est demandé.", fields: ["members"] },
  { id: "preferences", title: "Goûts et contraintes", subtitle: "Régimes, allergies et aliments à éviter, pour chaque personne.", fields: ["members"] },
  { id: "meals", title: "Les repas à prévoir", subtitle: "Choisissez les repas que FOODLEK doit planifier cette semaine.", fields: ["schedule"] },
  { id: "budget", title: "Votre budget", subtitle: "Le budget alimentaire de la semaine pour tout le foyer.", fields: ["budgetEuros", "budgetMode"] },
  { id: "cooking", title: "En cuisine", subtitle: "Temps disponible, niveau et matériel : on s'adapte.", fields: ["maxWeekdayMinutes", "maxWeekendMinutes", "skill", "equipment"] },
  { id: "store", title: "Vos courses", subtitle: "Où faites-vous vos courses, et comment ?", fields: ["storeId", "organic", "storeBrand", "acceptPromotions"] },
  { id: "pantry", title: "Mon placard", subtitle: "Ce que vous avez déjà ne sera pas ajouté au panier.", fields: ["pantryIngredientIds"] },
  { id: "recap", title: "Tout est prêt", subtitle: "Vérifiez, puis générez votre semaine.", fields: [] },
];

const AUTOSAVE_DELAY_MS = 900;

export function HouseholdWizard({
  mode,
  initial,
  initialStep = 0,
  catalog,
}: {
  mode: "onboarding" | "edit";
  initial: HouseholdSetup;
  initialStep?: number;
  catalog: WizardCatalog;
}) {
  const router = useRouter();
  const [step, setStep] = useState(Math.min(Math.max(0, initialStep), STEPS.length - 1));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const form = useForm<HouseholdSetup>({
    resolver: zodResolver(householdSetupSchema),
    defaultValues: initial,
    mode: "onTouched",
  });
  const values = useWatch({ control: form.control });
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  // Autosave (onboarding only): the wizard can be resumed later, on any device.
  const serialized = useMemo(() => JSON.stringify({ step, data: values }), [step, values]);
  const firstRender = useRef(true);
  useEffect(() => {
    if (mode !== "onboarding") return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = window.setTimeout(async () => {
      setSaveState("saving");
      const res = await saveDraftAction(JSON.parse(serialized) as unknown);
      setSaveState(res.ok ? "saved" : "error");
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [serialized, mode]);

  function focusHeading() {
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function next() {
    const ok = current.fields.length === 0 || (await form.trigger(current.fields, { shouldFocus: true }));
    if (!ok) {
      toast.error("Quelques informations sont à compléter.");
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    focusHeading();
  }

  function back() {
    setStep((s) => Math.max(0, s - 1));
    focusHeading();
  }

  function submit(data: HouseholdSetup) {
    startTransition(async () => {
      if (mode === "onboarding") {
        const res = await completeOnboardingAction(data);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Votre semaine est prête.");
        router.push("/dashboard");
      } else {
        const res = await updateHouseholdAction(data);
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success(res.message ?? "Enregistré.");
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  function onInvalid() {
    const firstBad = STEPS.findIndex((s) => s.fields.some((f) => form.getFieldState(f).invalid));
    if (firstBad >= 0) setStep(firstBad);
    toast.error("Une étape contient des informations à corriger.");
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(submit, onInvalid)}
        noValidate
        className="mx-auto flex w-full max-w-2xl flex-1 flex-col"
        onKeyDown={(e) => {
          // Enter in a text field should not submit the whole wizard.
          if (e.key === "Enter" && !isLast && (e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
        }}
      >
        <div className="sticky top-0 z-10 -mx-4 bg-background/90 px-4 pt-3 pb-4 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Étape {step + 1} sur {STEPS.length}
            </span>
            {mode === "onboarding" ? (
              <span className="inline-flex items-center gap-1.5" aria-live="polite">
                {saveState === "saving" ? (
                  <>
                    <Spinner className="size-3.5" /> Enregistrement…
                  </>
                ) : saveState === "saved" ? (
                  <>
                    <CloudIcon aria-hidden className="size-3.5" /> Enregistré
                  </>
                ) : saveState === "error" ? (
                  <span className="text-destructive">Brouillon non enregistré</span>
                ) : null}
              </span>
            ) : null}
          </div>
          <Progress value={progress} className="mt-2 h-1.5" aria-label={`Progression : ${progress} %`} />
        </div>

        <div key={current.id} className="flex flex-1 animate-rise flex-col gap-6 py-4">
          <div className="flex flex-col gap-1.5">
            <h1 ref={headingRef} tabIndex={-1} className="font-display text-3xl font-semibold outline-none sm:text-4xl">
              {current.title}
            </h1>
            <p className="text-muted-foreground">{current.subtitle}</p>
          </div>
          {current.id === "household" && <HouseholdStep />}
          {current.id === "profiles" && <ProfilesStep />}
          {current.id === "preferences" && <PreferencesStep catalog={catalog} />}
          {current.id === "meals" && <MealsStep />}
          {current.id === "budget" && <BudgetStep />}
          {current.id === "cooking" && <CookingStep />}
          {current.id === "store" && <StoreStep catalog={catalog} />}
          {current.id === "pantry" && <PantryStep catalog={catalog} />}
          {current.id === "recap" && <RecapStep catalog={catalog} onEdit={(id) => setStep(STEPS.findIndex((s) => s.id === id))} />}
        </div>

        <div className="sticky bottom-0 -mx-4 mt-auto border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="ghost" onClick={back} disabled={step === 0 || pending}>
              <ArrowLeftIcon data-icon="inline-start" />
              Retour
            </Button>
            {isLast ? (
              <Button key="submit" type="submit" size="lg" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                {mode === "onboarding" ? "Générer ma semaine" : "Enregistrer"}
              </Button>
            ) : (
              <Button key="next" type="button" size="lg" onClick={next}>
                Continuer
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
          {isLast && mode === "onboarding" ? (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <InfoIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Les estimations de FOODLEK sont générales et ne remplacent pas l'avis d'un professionnel de santé.
            </p>
          ) : null}
        </div>
      </form>
    </FormProvider>
  );
}
