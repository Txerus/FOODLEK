import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GUIDES } from "@/content/guides";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/guides/${guide.slug}` }, openGraph: { type: "article" } };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <nav aria-label="Fil d'Ariane" className="text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          Accueil
        </Link>{" "}
        / Guides
      </nav>
      <header className="flex flex-col gap-3">
        <h1 className="font-display text-4xl font-semibold text-balance">{guide.title}</h1>
        <p className="text-lg text-muted-foreground">{guide.description}</p>
      </header>
      {guide.sections.map((s) => (
        <section key={s.heading} className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold">{s.heading}</h2>
          {s.paragraphs.map((p) => (
            <p key={p} className="leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}
      <aside className="surface flex flex-col items-start gap-3 p-6">
        <p className="font-semibold">FOODLEK applique ces principes automatiquement.</p>
        <Button asChild>
          <Link href="/signup">Créer ma semaine</Link>
        </Button>
      </aside>
      <ul className="flex flex-col gap-1 text-sm">
        {GUIDES.filter((g) => g.slug !== guide.slug).map((g) => (
          <li key={g.slug}>
            <Link href={`/guides/${g.slug}`} className="underline underline-offset-4">
              {g.title}
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}
