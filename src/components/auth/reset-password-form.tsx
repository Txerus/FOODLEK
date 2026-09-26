"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const schema = z
  .object({ password: z.string().min(10, "10 caractères minimum").max(128), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Les mots de passe ne correspondent pas" });

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") ? "Ce lien n'est plus valide. Demandez-en un nouveau." : null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Lien incomplet. <Link href="/forgot-password" className="underline">Demandez un nouveau lien</Link>.
        </AlertDescription>
      </Alert>
    );
  }
  if (done) {
    return (
      <Alert>
        <AlertDescription>
          Mot de passe modifié. <Link href="/login" className="underline">Se connecter</Link>
        </AlertDescription>
      </Alert>
    );
  }

  async function onSubmit(values: z.infer<typeof schema>) {
    setError(null);
    const { error: authError } = await authClient.resetPassword({ newPassword: values.password, token: token ?? "" });
    if (authError) {
      setError("Ce lien n'est plus valide. Demandez-en un nouveau.");
      return;
    }
    setDone(true);
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
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
          <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="confirm">Confirmation</FieldLabel>
          <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...form.register("confirm")} />
          <FieldError errors={[errors.confirm]} />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Enregistrer
        </Button>
      </FieldGroup>
    </form>
  );
}
