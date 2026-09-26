"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  name: z.string().trim().min(1, "Indiquez un prénom").max(40),
  email: z.string().trim().email("Adresse e-mail invalide"),
  password: z.string().min(10, "10 caractères minimum").max(128),
  consent: z.boolean().refine((v) => v, "Nécessaire pour créer le compte"),
});

type Values = z.infer<typeof schema>;

export function SignupForm({ requireVerification }: { requireVerification: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", consent: false },
  });

  async function onSubmit(values: Values) {
    setError(null);
    const { error: authError } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: "/onboarding",
    });
    if (authError) {
      setError(
        authError.status === 429
          ? "Trop de tentatives. Patientez une minute."
          : authError.code === "USER_ALREADY_EXISTS" || authError.status === 422
            ? "Un compte existe déjà avec cette adresse."
            : "La création du compte a échoué. Vérifiez les informations saisies.",
      );
      return;
    }
    if (requireVerification) {
      setSent(true);
      return;
    }
    router.replace("/onboarding");
    router.refresh();
  }

  if (sent) {
    return (
      <Alert>
        <AlertDescription>Un e-mail de confirmation vous a été envoyé. Ouvrez le lien qu'il contient pour continuer.</AlertDescription>
      </Alert>
    );
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Prénom ou pseudonyme</FieldLabel>
          <Input id="name" autoComplete="given-name" aria-invalid={Boolean(errors.name)} {...form.register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
          <FieldDescription>10 caractères minimum.</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
        <Field orientation="horizontal" data-invalid={Boolean(errors.consent)}>
          <Checkbox
            id="consent"
            aria-invalid={Boolean(errors.consent)}
            onCheckedChange={(checked) => form.setValue("consent", checked === true, { shouldValidate: true })}
          />
          <FieldLabel htmlFor="consent" className="font-normal leading-snug">
            J'accepte que mes informations (dont, si je les renseigne, poids et objectifs) soient utilisées pour calculer mes menus, selon la{" "}
            <Link href="/confidentialite" className="underline underline-offset-4">
              politique de confidentialité
            </Link>
            .
          </FieldLabel>
        </Field>
        <FieldError errors={[errors.consent]} />
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Créer mon compte
        </Button>
      </FieldGroup>
    </form>
  );
}
