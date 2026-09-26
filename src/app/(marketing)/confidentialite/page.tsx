import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité", alternates: { canonical: "/confidentialite" } };

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "Données collectées",
    p: [
      "Compte : prénom ou pseudonyme, adresse e-mail, mot de passe (stocké sous forme hachée).",
      "Foyer : composition, repas à planifier, budget, préférences de cuisine et de courses, contenu du placard.",
      "Profils : prénom ou pseudonyme, préférences alimentaires, allergies. Uniquement pour les profils détaillés que vous choisissez de remplir : sexe physiologique, année de naissance, taille, poids, niveau d'activité, objectif. Les situations particulières (grossesse, allaitement…) ne sont renseignées que si vous le décidez, pour désactiver toute restriction.",
    ],
  },
  {
    h: "Finalités",
    p: [
      "Ces données servent uniquement à calculer vos menus, portions, listes de courses et budget. Elles ne sont ni vendues, ni utilisées à des fins publicitaires, ni transmises à des enseignes.",
      "Les mesures corporelles ne sont jamais enregistrées dans les journaux techniques.",
    ],
  },
  {
    h: "Base légale et consentement",
    p: [
      "Le traitement repose sur l'exécution du service que vous demandez et, pour les données de santé que vous choisissez de renseigner (poids, objectifs, situations particulières), sur votre consentement explicite, donné à la création du compte. Vous pouvez retirer ces informations à tout moment en passant un profil en mode simplifié.",
    ],
  },
  {
    h: "Durée de conservation",
    p: ["Les données sont conservées tant que le compte existe. La suppression du compte efface le foyer (s'il n'est pas partagé), les profils, le placard et les plannings."],
  },
  {
    h: "Vos droits",
    p: [
      "Vous pouvez à tout moment exporter vos données (Compte et données → Exporter) et supprimer votre compte. Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition prévus par le RGPD, ainsi que du droit d'introduire une réclamation auprès de la CNIL.",
    ],
  },
  {
    h: "Sécurité",
    p: ["Connexions chiffrées, sessions sécurisées, contrôle d'accès sur chaque donnée du foyer, limitation des tentatives de connexion."],
  },
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Politique de confidentialité</h1>
      {SECTIONS.map((s) => (
        <section key={s.h} className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-semibold">{s.h}</h2>
          {s.p.map((p) => (
            <p key={p} className="leading-relaxed text-muted-foreground">
              {p}
            </p>
          ))}
        </section>
      ))}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold">Contact</h2>
        <p className="text-muted-foreground">
          {siteConfig.contactEmail ? (
            <>
              Pour toute demande relative à vos données : <a className="underline" href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>.
            </>
          ) : (
            "L'adresse de contact de l'éditeur sera publiée avant l'ouverture du service."
          )}
        </p>
      </section>
    </article>
  );
}
