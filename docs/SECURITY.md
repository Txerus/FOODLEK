# Sécurité et confidentialité — audit

| Risque                 | Mesure en place                                                                                                                                                                                                                 | Vérification                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Authentification       | Better Auth : mots de passe hachés (scrypt), 10 caractères min., sessions en base (30 j, renouvelées), cookies `HttpOnly`/`SameSite`, `Secure` en HTTPS, révocation des sessions au changement/réinitialisation du mot de passe | —                                            |
| Force brute            | Limitation en base : connexion 5/min, inscription 3/min, reset 3/5 min (production)                                                                                                                                             | —                                            |
| Énumération de comptes | Message identique pour le « mot de passe oublié »                                                                                                                                                                               | —                                            |
| Autorisation / IDOR    | Toute action résout le foyer depuis la session (`householdForAction`) et vérifie l'appartenance du planning (`assertPlanInHousehold`) ; les pages passent par `requireHousehold` ; `loadPlanView` filtre par foyer              | `tests/integration/household-access.test.ts` |
| CSRF                   | Server actions Next.js (vérification de l'origine, POST uniquement) ; Better Auth vérifie l'origine (`baseURL`)                                                                                                                 | —                                            |
| XSS                    | Rendu React échappé ; seul `dangerouslySetInnerHTML` : JSON-LD sérialisé avec échappement de `<` ; CSP `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`                                                      | —                                            |
| Injection SQL          | Requêtes Drizzle paramétrées ; les rares fragments `sql` ne contiennent que des références de colonnes                                                                                                                          | —                                            |
| SSRF                   | Aucune URL fournie par l'utilisateur n'est appelée ; URLs des fournisseurs fixes                                                                                                                                                | —                                            |
| Redirection ouverte    | `safeRedirect` n'accepte que des chemins relatifs                                                                                                                                                                               | —                                            |
| Upload                 | Aucun upload pour l'instant                                                                                                                                                                                                     | —                                            |
| Secrets                | Variables serveur validées (`src/server/env.ts`, module `server-only`), aucune variable secrète en `NEXT_PUBLIC_`, `.env*` ignorés par Git, `.env.example` sans secret                                                          | —                                            |
| En-têtes               | CSP, HSTS (prod), `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, COOP ; `poweredByHeader` désactivé                                                                                      | `next.config.ts`                             |
| Journaux               | Logger JSON avec masquage des clés sensibles ; aucune mesure corporelle journalisée                                                                                                                                             | —                                            |
| Webhooks               | Aucun pour l'instant                                                                                                                                                                                                            | —                                            |
| Dépendances            | `pnpm audit --prod` : 1 alerte modérée (esbuild ≤ 0.24 via `drizzle-kit`, outil de développement, concerne uniquement son serveur de dev)                                                                                       | à suivre                                     |

## RGPD

- Minimisation : profil simplifié sans mensurations ; en repassant un profil en « simplifié », taille, poids et sexe sont effacés côté serveur.
- Consentement explicite à l'inscription pour les données de santé que l'utilisateur choisit de renseigner.
- Export JSON complet (`/api/export`) et suppression du compte (foyer non partagé supprimé en cascade).
- Politique de confidentialité : `/confidentialite`. L'adresse de contact de l'éditeur est à configurer (`NEXT_PUBLIC_CONTACT_EMAIL`).

## Points ouverts

- CSP avec `'unsafe-inline'` pour les scripts (Next.js injecte des scripts inline) ; passer à une CSP à nonce rendrait toutes les pages dynamiques.
- Pas encore de vérification d'e-mail obligatoire par défaut (`REQUIRE_EMAIL_VERIFICATION`) : nécessite un transport d'e-mails (Resend configuré via `RESEND_API_KEY`).
- Analytics : la table existe, aucun événement n'est encore émis.
