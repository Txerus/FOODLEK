"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { AccessDeniedError, getCurrentUser } from "../auth/access";
import { auth } from "../auth/auth";
import { deleteAccount } from "../services/account";
import { runAction, type ActionResult } from "./result";

export async function deleteAccountAction(input: unknown): Promise<ActionResult> {
  return runAction("deleteAccount", async () => {
    z.object({ confirmation: z.literal("SUPPRIMER", { error: "Tapez SUPPRIMER pour confirmer." }) }).parse(input);
    const user = await getCurrentUser();
    if (!user) throw new AccessDeniedError();
    await auth().api.signOut({ headers: await headers() });
    await deleteAccount(user.id);
    return { data: undefined };
  });
}
