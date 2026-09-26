import "server-only";
import { ZodError } from "zod";
import { AccessDeniedError } from "../auth/access";
import { errorContext, logger } from "../observability/logger";

export type ActionResult<T = undefined> =
  | { ok: true; data: T; message?: string | null }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Wraps a server action body: validation and access errors become readable
 * messages, unexpected errors are logged (without personal data) and hidden.
 */
export async function runAction<T>(name: string, body: () => Promise<{ data: T; message?: string | null }>): Promise<ActionResult<T>> {
  try {
    const { data, message } = await body();
    return { ok: true, data, message: message ?? null };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) fieldErrors[issue.path.join(".")] = issue.message;
      return { ok: false, error: "Certaines informations sont invalides.", fieldErrors };
    }
    if (error instanceof AccessDeniedError) return { ok: false, error: error.message };
    if (error instanceof UserFacingError) return { ok: false, error: error.message };
    logger.error(`action.${name}.failed`, errorContext(error));
    return { ok: false, error: "Une erreur inattendue est survenue. Réessayez dans un instant." };
  }
}

/** An error whose message is safe and useful to show to the user. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}
