@AGENTS.md

# FOODLEK — conventions du projet

- Le moteur métier vit dans `src/domain/` : fonctions pures, testées, sans import de Next.js, de React ni de la base.
- Aucune donnée inventée : prix, produits, valeurs nutritionnelles, poids de paquets et intégrations ont une source. Sans source → `MISSING`, jamais une valeur plausible. Les données de démonstration portent la qualité `DEMO`.
- Tout accès à une ressource d'un foyer passe par `src/server/auth/access.ts` (`householdForAction`, `assertPlanInHousehold`).
- Les server actions valident leurs entrées avec Zod et renvoient un `ActionResult` via `runAction`.
- Ne jamais journaliser de données personnelles (poids, e-mail, nom) : `logger` ne reçoit que des identifiants.
- Textes de l'interface en français. Composants shadcn dans `src/components/ui` (vendorisés depuis le registre officiel).
- Après chaque changement significatif : `pnpm typecheck && pnpm lint && pnpm test`, puis `pnpm test:integration` et `pnpm build`.
