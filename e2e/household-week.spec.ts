import { expect, test, type Page } from "@playwright/test";

/**
 * Fundamental workflow: create a household with two different people,
 * generate the week, check personalised portions and the shopping list,
 * replace a meal and check that basket and budget are recalculated.
 */

async function continueTo(page: Page, title: string) {
  await page.getByRole("button", { name: "Continuer" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

function euros(text: string): number {
  return Number(text.replace(/[^\d,]/g, "").replace(",", "."));
}

test("créer un foyer, générer la semaine, remplacer un repas", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  // Sign up
  await page.goto("/signup");
  await page.getByLabel("Prénom ou pseudonyme").fill("Alex");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill("un-mot-de-passe-solide");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  // Step 1: household of two adults (the default)
  await expect(page.getByRole("heading", { level: 1, name: "Votre foyer" })).toBeVisible();
  await expect(page.getByText("Repas préparés pour")).toContainText("2 personnes");

  // Step 2: two different profiles
  await continueTo(page, "Les profils");
  await page.getByRole("radio", { name: /Détaillé/ }).click();
  await page.getByRole("radio", { name: "Homme" }).click();
  await page.getByLabel("Année de naissance").fill("1998");
  await page.getByLabel("Taille").fill("180");
  await page.getByLabel("Poids").fill("90");
  await page.getByRole("radio", { name: /Modérée/ }).click();
  await page.getByRole("radio", { name: "Perte de poids", exact: true }).click();
  await page.getByRole("switch", { name: /protéines élevé/i }).click();

  await page.getByRole("tab", { name: /Personne 2/ }).click();
  await page.getByLabel("Prénom ou pseudonyme").fill("Camille");
  await page.getByRole("radio", { name: /Détaillé/ }).click();
  await page.getByRole("radio", { name: "Femme", exact: true }).click();
  await page.getByLabel("Année de naissance").fill("1999");
  await page.getByLabel("Taille").fill("165");
  await page.getByLabel("Poids").fill("60");
  await page.getByRole("radio", { name: "Maintien", exact: true }).click();

  // Steps 3 → 8
  await continueTo(page, "Goûts et contraintes");
  await continueTo(page, "Les repas à prévoir");
  await expect(page.getByText(/12 repas/)).toBeVisible();
  await continueTo(page, "Votre budget");
  await page.getByLabel("Budget alimentaire par semaine").fill("90");
  await continueTo(page, "En cuisine");
  await continueTo(page, "Vos courses");
  await page.getByRole("radio", { name: /Magasin de démonstration/ }).click();
  await continueTo(page, "Mon placard");
  await continueTo(page, "Tout est prêt");
  await page.getByRole("button", { name: "Générer ma semaine" }).click();

  // Dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByRole("heading", { name: "Bonjour Alex" })).toBeVisible();
  await expect(page.getByText("Budget de la semaine")).toBeVisible();

  // Planning: several recipes, different portions for the same meal
  await page.goto("/planning");
  const meals = page.locator("main li.surface");
  const count = await meals.count();
  expect(count).toBeGreaterThan(0);
  const titles = new Set(await page.locator("main li.surface h3").allInnerTexts());
  expect(titles.size).toBeGreaterThanOrEqual(3);
  const firstMeal = meals.first();
  const plates = await firstMeal.locator("p.min-w-0").allInnerTexts();
  expect(plates).toHaveLength(2);
  expect(plates[0]).toContain("Alex");
  expect(plates[1]).toContain("Camille");
  expect(plates[0]).not.toEqual(plates[1].replace("Camille", "Alex"));

  // Shopping list: the total equals the sum of the lines
  await page.goto("/shopping");
  const total = euros(await page.locator("header p.font-display").innerText());
  const lineTexts = await page.locator("main ul.surface > li [data-testid=line-price]").allInnerTexts();
  const sum = lineTexts.map(euros).reduce((a, b) => a + b, 0);
  expect(Math.abs(sum - total)).toBeLessThan(0.01);
  expect(total).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: /Démo/i }).first()).toBeVisible();

  // Replace a meal: the plan, basket and budget are recomputed
  await page.goto("/planning");
  const beforeTitle = await page.locator("main li.surface h3").first().innerText();
  await page.locator("main li.surface").first().getByRole("button", { name: /Modifier :/ }).click();
  await page.getByRole("menuitem", { name: "Trop cher" }).click();
  // A preview is shown first; nothing changes until "Remplacer".
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Remplacer", exact: true })).toBeVisible({ timeout: 30_000 });
  await dialog.getByRole("button", { name: "Remplacer", exact: true }).click();
  await expect(page.locator("main li.surface h3").first()).not.toHaveText(beforeTitle, { timeout: 30_000 });
  const afterBasket = euros((await page.getByText(/^Panier/).innerText()).split("/")[0]);
  // The shopping list reflects the new menu: same total as the planning.
  await page.goto("/shopping");
  expect(euros(await page.locator("header p.font-display").innerText())).toBeCloseTo(afterBasket, 2);
  await page.goto("/planning");

  // Cooking mode from the recipe page
  await page.locator("main li.surface h3 a").first().click();
  await page.getByRole("link", { name: "Mode cuisine" }).click();
  await expect(page.getByText(/Étape 1\//)).toBeVisible();
  await page.getByRole("button", { name: /Suivant/ }).click();
  await expect(page.getByText(/Étape 2\//)).toBeVisible();
});

test("un visiteur non connecté est redirigé vers la connexion", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
});
