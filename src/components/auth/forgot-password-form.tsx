"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

const schema = z.object({ email: z.string().trim().email("Adresse e-mail invalide") });

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: z.infer<typeof schema>) {
    setError(null);
    const { error: authError } = await authClient.requestPasswordReset({ email: values.email, redirectTo: "/reset-password" });
    // Same message whether the address exists or not, to avoid account enumeration.
    if (authError && authError.status !== 404) {
      setError(authError.status === 429 ? "Trop de demandes. Réessayez dans quelques minutes." : "L'envoi a échoué. Réessayez plus tard.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Alert>
        <AlertDescription>
          Si un compte existe pour cette adresse, un e-mail avec un lien de réinitialisation vient d'être envoyé.
        </AlertDescription>
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
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">E-mail du compte</FieldLabel>
          <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
          Recevoir un lien
        </Button>
      </FieldGroup>
    </form>
  );
}
