import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/content/guides";

export const metadata: Metadata = {
  title: "Guides",
  description: "Conseils pratiques pour mieux planifier ses repas, faire ses courses et tenir son budget.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-semibold">Guides</h1>
        <p className="text-muted-foreground">Conseils pratiques pour planifier ses repas, faire ses courses et tenir son budget.</p>
      </header>
      <ul className="flex flex-col gap-3">
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="surface flex flex-col gap-1 p-5 transition-shadow hover:shadow-lift">
              <span className="font-semibold">{g.title}</span>
              <span className="text-sm text-muted-foreground">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
