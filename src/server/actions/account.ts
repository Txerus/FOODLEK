"use server";

import { cookies, headers } from "next/headers";
import { z } from "zod";
import { AccessDeniedError, getCurrentUser } from "../auth/access";
import { getAuth } from "../auth/better-auth";
import { deleteAccount } from "../services/account";
import { assertWithinLimit } from "../rate-limit";
import { runAction, UserFacingError, type ActionResult } from "./result";

const SESSION_COOKIES = ["better-auth.session_token", "better-auth.session_data"];

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  return runAction("deleteAccount", async () => {
    const data = z
      .object({
        confirmation: z.literal("SUPPRIMER", { error: "Tapez SUPPRIMER pour confirmer." }),
        password: z.string().min(1, "Saisissez votre mot de passe.").max(200),
      })
      .parse(input);
    const user = await getCurrentUser();
    if (!user) throw new AccessDeniedError();
    await assertWithinLimit("deleteAccount", user.id);
    const requestHeaders = await headers();
    // A stolen session alone must not be enough to erase the account.
    try {
      await getAuth().api.verifyPassword({ body: { password: data.password }, headers: requestHeaders });
    } catch {
      throw new UserFacingError("Mot de passe incorrect.");
    }
    // Delete first: if it fails, the user is still signed in and can retry.
    await deleteAccount(user.id);
    try {
      await getAuth().api.signOut({ headers: requestHeaders });
    } catch {
      // The session row is already gone with the user; the cookies are cleared below.
    }
    const jar = await cookies();
    for (const name of SESSION_COOKIES) {
      jar.delete(name);
      jar.delete(`__Secure-${name}`);
    }
    return { data: undefined };
  });
}
