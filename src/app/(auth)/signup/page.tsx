import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/server/auth/access";
import { env } from "@/server/env";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false } };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/onboarding");
  return (
    <AuthCard
      title="Créer ma semaine"
      description="Un compte pour le foyer. Vous pourrez ajouter chaque personne juste après."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <SignupForm requireVerification={env().REQUIRE_EMAIL_VERIFICATION} />
    </AuthCard>
  );
}
