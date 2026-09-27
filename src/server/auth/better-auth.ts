import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "../db/client";
import * as schema from "../db/schema";
import { env } from "../env";
import { sendMail } from "../mail/mailer";

function createAuth() {
  const config = env();
  return betterAuth({
    appName: "FOODLEK",
    baseURL: config.APP_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db(), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      requireEmailVerification: config.REQUIRE_EMAIL_VERIFICATION,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: "Réinitialiser votre mot de passe FOODLEK",
          text: `Bonjour,\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n${url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: config.REQUIRE_EMAIL_VERIFICATION,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendMail({
          to: user.email,
          subject: "Confirmez votre adresse e-mail",
          text: `Bienvenue sur FOODLEK !\n\nConfirmez votre adresse en ouvrant ce lien :\n${url}`,
        });
      },
    },
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "user", input: false },
      },
      // Account deletion goes through deleteAccountAction only, which also
      // erases the household data (Better Auth's endpoint would not).
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Short: a session revoked elsewhere (password change, deletion) stops working within a minute.
      cookieCache: { enabled: true, maxAge: 60 },
    },
    rateLimit: {
      enabled: config.NODE_ENV === "production",
      storage: "database",
      modelName: "rateLimit",
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
        "/request-password-reset": { window: 300, max: 3 },
      },
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: config.APP_URL.startsWith("https://"),
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { __foodlekAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.__foodlekAuth) globalForAuth.__foodlekAuth = createAuth();
  return globalForAuth.__foodlekAuth;
}
