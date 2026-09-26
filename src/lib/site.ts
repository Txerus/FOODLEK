export const siteConfig = {
  name: "FOODLEK",
  tagline: "Vos repas, votre nutrition et vos courses optimisés ensemble",
  description:
    "FOODLEK planifie la semaine de tout le foyer : un seul plat cuisiné, des portions adaptées à chacun, une liste de courses en vrais conditionnements et un budget tenu.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Data-protection contact shown in the privacy policy. Configure before going live. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? null,
} as const;
