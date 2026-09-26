import { ArrowRightIcon, CheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { landingExample } from "@/components/marketing/example";
import { PersonDot } from "@/components/foodlek/person";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { RECIPES } from "@/data/recipes";
import { totalMinutes } from "@/domain/catalog/types";
import { formatMinutes } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — Vos repas, votre nutrition et vos courses optimisés ensemble` },
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "Faut-il cuisiner deux repas différents quand on n'a pas les mêmes objectifs ?",
    a: "Non. FOODLEK propose un seul plat pour le foyer et ajuste la portion de chacun : plus de protéines et de légumes pour l'un, plus de féculents pour l'autre. Vous cuisinez une fois, la liste de courses additionne exactement les assiettes.",
  },
  {
    q: "D'où viennent les valeurs nutritionnelles ?",
    a: "Elles sont recalculées à partir des ingrédients, avec des tables de composition publiques et identifiées (USDA FoodData Central aujourd'hui, ANSES-Ciqual dès l'import de la table). Aucune valeur n'est inventée ni générée par une IA.",
  },
  {
    q: "Les prix affichés sont-ils ceux de mon supermarché ?",
    a: "Chaque prix indique son magasin, sa source et sa date. Les grandes enseignes françaises ne proposent pas d'accès public à leurs prix ; tant qu'aucun accès autorisé n'existe, FOODLEK l'indique clairement et n'invente aucun prix. Le magasin de démonstration utilise des prix fictifs, étiquetés « Démo ».",
  },
  {
    q: "Puis-je utiliser FOODLEK sans donner mon poids ?",
    a: "Oui. Le profil simplifié ne demande ni poids ni taille : les portions suivent l'appétit que vous indiquez. Le profil détaillé sert uniquement à estimer les besoins énergétiques.",
  },
  {
    q: "FOODLEK convient-il pendant une grossesse ou avec un régime médical ?",
    a: "FOODLEK n'applique alors aucune restriction et se contente d'adapter les portions à l'appétit. Ces situations demandent l'accompagnement d'un professionnel de santé, que FOODLEK ne remplace pas.",
  },
];

const STEPS = [
  { title: "Décrivez le foyer", text: "Qui mange, combien de repas, votre budget, votre temps en cuisine. Cinq minutes, une seule fois." },
  { title: "Recevez la semaine", text: "Un menu varié qui concilie les besoins de chacun, le budget et ce que vous avez déjà." },
  { title: "Cuisinez une fois", text: "Une recette pour tous, une portion pour chacun, un mode cuisine pas à pas avec minuteurs." },
  { title: "Faites les courses", text: "Une liste par rayon, en vrais paquets, avec le prix, le magasin et la date de chaque prix." },
];

export default function HomePage() {
  const { recipe, plates } = landingExample();
  const featured = ["poulet-curry-coco", "dahl-lentilles-corail-coco-epinards", "saumon-laque-soja-miel-brocoli", "chili-con-carne-riz"]
    .map((s) => RECIPES.find((r) => r.slug === s))
    .filter((r) => r !== undefined);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_10%,var(--paprika-soft),transparent),radial-gradient(50%_60%_at_0%_20%,var(--basil-soft),transparent)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium text-primary">Planification des repas pour tout le foyer</p>
            <h1 className="font-display text-5xl leading-[1.02] font-semibold tracking-tight text-balance sm:text-6xl">
              Vos repas, votre nutrition et vos courses optimisés ensemble.
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Un seul plat cuisiné, une portion adaptée à chaque personne, une liste de courses en vrais conditionnements et un budget tenu.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 px-6 text-base">
                <Link href="/signup">
                  Créer ma semaine
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
                <Link href="#fonctionnement">Voir comment ça marche</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {["1 foyer", "2 profils différents", "1 menu commun", "1 budget", "1 panier"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckIcon aria-hidden className="size-4 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Same meal, two portions */}
          <figure className="surface relative flex flex-col gap-5 p-6 shadow-lift sm:p-8">
            <figcaption className="flex flex-col gap-1">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Mardi · Dîner · {formatMinutes(totalMinutes(recipe))}</span>
              <span className="font-display text-2xl font-semibold text-balance">{recipe.title}</span>
            </figcaption>
            <div className="grid gap-3 sm:grid-cols-2">
              {plates.map((p, i) => (
                <div key={p.name} className="flex flex-col gap-3 rounded-2xl bg-muted/70 p-4">
                  <div className="flex items-center gap-2">
                    <PersonDot index={i} className="size-2.5" />
                    <span className="font-semibold">{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.goal}</p>
                  <dl className="flex flex-col gap-1.5 text-sm">
                    {p.protein ? (
                      <div className="flex justify-between gap-2">
                        <dt>Poulet</dt>
                        <dd className="font-semibold tabular">{p.protein.grams} g</dd>
                      </div>
                    ) : null}
                    {p.starch ? (
                      <div className="flex justify-between gap-2">
                        <dt>Riz</dt>
                        <dd className="font-semibold tabular">{p.starch.cookedGrams ?? p.starch.grams} g cuit</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between gap-2">
                      <dt>Légumes</dt>
                      <dd className="font-semibold tabular">{Math.round(p.vegetables / 10) * 10} g</dd>
                    </div>
                  </dl>
                  <p className="border-t pt-2 text-xs text-muted-foreground tabular">
                    {Math.round(p.kcal)} kcal · {Math.round(p.proteinG)} g de protéines
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Exemple réel calculé par le moteur pour deux profils (homme, 28 ans, 90 kg, perte de poids ; femme, 27 ans, 60 kg, maintien). Une seule recette, deux assiettes.
            </p>
          </figure>
        </div>
      </section>

      {/* How it works */}
      <section id="fonctionnement" className="scroll-mt-20 border-y bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-3">
            <h2 className="font-display text-4xl font-semibold">Tout est relié</h2>
            <p className="text-lg text-muted-foreground">
              Les besoins de chacun décident des portions, les portions décident des quantités, les quantités décident des paquets à acheter, les paquets décident du budget. Changez un repas : tout se recalcule.
            </p>
          </div>
          <ol className="grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2">
                <span className="font-display text-3xl font-semibold text-paprika tabular">0{i + 1}</span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto grid max-w-6xl gap-16 px-4 py-20 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-semibold">Une nutrition personnalisée, sans excès</h2>
            <p className="text-muted-foreground">
              Besoins estimés avec l'équation de Mifflin-St Jeor, déficit modéré et plafonné pour la perte de poids, protéines ajustées. Grossesse, allaitement, troubles alimentaires, mineurs : aucune restriction, les portions suivent l'appétit.
            </p>
            <p className="text-sm text-muted-foreground">Les estimations ne remplacent pas l'avis d'un professionnel de santé.</p>
          </div>
          <ul className="surface flex flex-col divide-y text-sm">
            {[
              ["Profil détaillé", "taille, poids, activité, objectif"],
              ["Profil simplifié", "l'appétit suffit, aucune mensuration"],
              ["Régimes", "végétarien, végan, pescétarien, halal, sans porc…"],
              ["Allergies", "les 14 allergènes réglementaires exclus"],
            ].map(([a, b]) => (
              <li key={a} className="flex justify-between gap-4 px-5 py-3.5">
                <span className="font-medium">{a}</span>
                <span className="text-right text-muted-foreground">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div id="budget" className="grid scroll-mt-20 gap-8 md:grid-cols-2 md:items-center">
          <div className="order-2 flex flex-col gap-3 md:order-1">
            <div className="surface flex flex-col gap-3 p-6">
              <p className="text-sm text-muted-foreground">Budget de la semaine</p>
              <p className="font-display text-4xl font-semibold tabular">
                82,63 € <span className="text-lg font-normal text-muted-foreground">/ 85,00 €</span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[97%] rounded-full bg-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Marge 2,37 € · 3,44 € par personne et par repas</p>
              <p className="text-xs text-muted-foreground">Illustration de l'affichage.</p>
            </div>
          </div>
          <div className="order-1 flex flex-col gap-3 md:order-2">
            <h2 className="font-display text-3xl font-semibold">Un budget qui tient</h2>
            <p className="text-muted-foreground">
              Budget strict, budget cible ou nutrition prioritaire : vous choisissez. Le panier est calculé sur les conditionnements réellement vendus, avec le coût par personne, par repas et par jour.
            </p>
          </div>
        </div>

        <div id="anti-gaspillage" className="grid scroll-mt-20 gap-8 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-semibold">Moins de restes, moins de gaspillage</h2>
            <p className="text-muted-foreground">
              Le moteur choisit les recettes qui partagent les mêmes paquets et propose de cuisiner un dîner en double pour le déjeuner du lendemain. Il vous dit pourquoi, en français.
            </p>
          </div>
          <blockquote className="surface p-6 font-display text-xl leading-snug text-pretty">
            « Ces trois recettes utilisent le même paquet de 1 kg de riz, ce qui réduit le coût et évite environ 350 g de reste. »
            <footer className="mt-3 font-sans text-sm text-muted-foreground">Exemple d'explication fournie avec chaque menu.</footer>
          </blockquote>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-semibold">Des prix honnêtes</h2>
            <p className="text-muted-foreground">
              Un prix n'est exact que pour un magasin et un moment. FOODLEK affiche la source, le magasin et l'heure de chaque prix, et signale clairement les prix estimés, anciens ou de démonstration. Jamais de prix inventé.
            </p>
          </div>
          <ul className="flex flex-wrap gap-2 text-sm">
            {["Live", "Très récent", "Récent", "Ancien", "Indisponible", "Démo"].map((l) => (
              <li key={l} className="rounded-full border bg-card px-3 py-1.5">
                {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recipes */}
      <section className="border-y bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-semibold">Des recettes simples, pensées pour la semaine</h2>
            <Link href="/recettes" className="text-sm font-medium underline-offset-4 hover:underline">
              Toutes les recettes
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((r) => (
              <li key={r.slug}>
                <Link href={`/recettes/${r.slug}`} className="group flex h-full flex-col gap-2 rounded-2xl border p-5 transition-shadow hover:shadow-lift">
                  <span className="text-xs text-muted-foreground">{formatMinutes(totalMinutes(r))}</span>
                  <span className="font-semibold text-balance group-hover:underline group-hover:underline-offset-4">{r.title}</span>
                  <span className="line-clamp-3 text-sm text-muted-foreground">{r.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto flex max-w-3xl scroll-mt-20 flex-col gap-6 px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="surface px-5">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start gap-5 rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12">
          <h2 className="font-display text-4xl font-semibold text-balance">Votre prochaine semaine est à cinq minutes.</h2>
          <Button asChild size="lg" variant="secondary" className="h-12 px-6 text-base">
            <Link href="/signup">
              Créer ma semaine
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
