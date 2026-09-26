import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/foodlek/page-header";
import { ChangePasswordForm, DeleteAccountDialog, SignOutButton } from "@/components/settings/account-forms";
import { Button } from "@/components/ui/button";
import { requireHousehold } from "@/server/auth/access";

export const metadata: Metadata = { title: "Compte et données" };

export default async function SettingsPage() {
  const { user } = await requireHousehold();
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Compte et données" />
      <section className="surface flex flex-col gap-3 p-5">
        <h2 className="font-semibold">Compte</h2>
        <p className="text-sm text-muted-foreground">
          {user.name} · {user.email}
        </p>
        <SignOutButton />
      </section>
      <section className="surface flex flex-col gap-3 p-5">
        <h2 className="font-semibold">Mot de passe</h2>
        <ChangePasswordForm />
      </section>
      <section className="surface flex flex-col gap-3 p-5">
        <h2 className="font-semibold">Vos données</h2>
        <p className="text-sm text-muted-foreground">
          Téléchargez toutes les données de votre compte et de votre foyer au format JSON. Voir la{" "}
          <Link href="/confidentialite" className="underline underline-offset-4">
            politique de confidentialité
          </Link>
          .
        </p>
        <Button asChild variant="outline" className="self-start">
          <a href="/api/export" download>
            Exporter mes données
          </a>
        </Button>
      </section>
      <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 p-5">
        <h2 className="font-semibold">Supprimer le compte</h2>
        <p className="text-sm text-muted-foreground">Toutes vos données seront effacées définitivement.</p>
        <div>
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
