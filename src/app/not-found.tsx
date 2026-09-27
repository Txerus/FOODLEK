import type { Metadata } from "next";
import Link from "next/link";
import { StatusPage } from "@/components/foodlek/status-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page introuvable" };

export default function NotFound() {
  return (
    <StatusPage code="Erreur 404" title="Cette page n'existe pas">
      <p>Le lien est peut-être ancien, ou la recette a été retirée.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/">Retour à l'accueil</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/recettes">Voir les recettes</Link>
        </Button>
      </div>
    </StatusPage>
  );
}
