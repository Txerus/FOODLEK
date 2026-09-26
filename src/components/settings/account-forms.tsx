"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { deleteAccountAction } from "@/server/actions/account";

export function ChangePasswordForm() {
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (next.length < 10) {
          toast.error("Le nouveau mot de passe doit contenir au moins 10 caractères.");
          return;
        }
        start(async () => {
          const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: true });
          if (error) toast.error("Mot de passe actuel incorrect.");
          else {
            toast.success("Mot de passe modifié. Les autres appareils ont été déconnectés.");
            setCurrent("");
            setNext("");
          }
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="current">Mot de passe actuel</FieldLabel>
          <Input id="current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="next">Nouveau mot de passe</FieldLabel>
          <Input id="next" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Button type="submit" variant="outline" disabled={pending} className="self-start">
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Changer le mot de passe
        </Button>
      </FieldGroup>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/");
        router.refresh();
      }}
    >
      Se déconnecter
    </Button>
  );
}

export function DeleteAccountDialog() {
  const [confirmation, setConfirmation] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Supprimer mon compte</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer définitivement le compte ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le compte, le foyer (s'il n'est partagé avec personne), les profils, le placard et les plannings seront effacés. Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="confirm-delete">Tapez SUPPRIMER pour confirmer</FieldLabel>
          <Input id="confirm-delete" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmation !== "SUPPRIMER" || pending}
            onClick={(e) => {
              e.preventDefault();
              start(async () => {
                const res = await deleteAccountAction({ confirmation });
                if (res.ok) {
                  toast.success("Compte supprimé.");
                  router.replace("/");
                  router.refresh();
                } else toast.error(res.error);
              });
            }}
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
