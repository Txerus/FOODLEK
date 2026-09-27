import type { ReactNode } from "react";

/** Centered message used by the 404 and error pages. */
export function StatusPage({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <main id="contenu" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-start justify-center gap-4 px-4 py-16">
      <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{code}</p>
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      <div className="flex flex-col gap-4 text-muted-foreground">{children}</div>
    </main>
  );
}
