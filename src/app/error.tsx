"use client";

import Link from "next/link";
import { StatusPage } from "@/components/foodlek/status-page";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <StatusPage code="Erreur" title="Un problème est survenu">
      <p>La page n'a pas pu s'afficher. Réessayez ; si le problème continue, revenez plus tard.</p>
      {error.digest ? <p className="text-xs">Référence : {error.digest}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => retry()}>
          Réessayer
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </StatusPage>
  );
}
