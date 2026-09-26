import { expect, test, type Page } from "@playwright/test";

/** Key pages on a phone: no horizontal overflow, tab bar navigation works. */

async function noHorizontalOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const culprits = [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > width + 1 && !e.closest("nav.fixed"))
      .slice(0, 3)
      .map((e) => `${e.tagName}.${String(e.className).slice(0, 60)}`);
    return { delta: document.documentElement.scrollWidth - width, culprits };
  });
  expect(overflow.delta, `${page.url()} ${overflow.culprits.join(" | ")}`).toBeLessThanOrEqual(1);
}

test("parcours mobile avec le compte de démonstration", async ({ page }) => {
  await page.goto("/");
  await noHorizontalOverflow(page);

  await page.goto("/login");
  await page.getByLabel("E-mail").fill("demo@foodlek.local");
  await page.getByLabel("Mot de passe").fill("demo-foodlek-2026");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  for (const path of ["/dashboard", "/planning", "/shopping", "/recipes", "/pantry", "/nutrition", "/stores", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await noHorizontalOverflow(page);
  }

  const tabbar = page.getByRole("navigation", { name: "Navigation principale" }).last();
  await tabbar.getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/shopping/);
  const first = page.locator("main ul.surface > li").first().getByRole("checkbox");
  const wasChecked = await first.isChecked();
  await first.click();
  await expect(first).toBeChecked({ checked: !wasChecked });
  await page.reload();
  await expect(page.locator("main ul.surface > li").first().getByRole("checkbox")).toBeChecked({ checked: !wasChecked });
});
