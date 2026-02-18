import { test, expect } from "@playwright/test";
import { getE2EOperatorCredentials } from "../helpers/env";
import { navigateFromSidebar } from "../helpers/navigation";
import { resetAndSeedOperatorData } from "../helpers/test-data";

test.describe("@smoke operador - auth y navegación", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("navega por sidebar y cierra sesión", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await navigateFromSidebar(page, "Contactos", "/contacts");
    await navigateFromSidebar(page, "Plantillas", "/templates");
    await navigateFromSidebar(page, "Campañas", "/campaigns");
    await navigateFromSidebar(page, "Rebotes", "/bounces");
    await navigateFromSidebar(page, "Configuración", "/settings");
    await navigateFromSidebar(page, "Dashboard", "/dashboard");

    await page.locator("header button.rounded-full").click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText("Gestor de Correos")).toBeVisible();
  });

  test("inicia sesión por email en contexto limpio", async ({ browser }) => {
    const credentials = getE2EOperatorCredentials();

    const context = await browser.newContext({ storageState: undefined });
    const anonymousPage = await context.newPage();

    await anonymousPage.goto("/login");
    await anonymousPage.getByRole("button", { name: "Iniciar sesión con email" }).click();
    await anonymousPage.getByLabel("Email").fill(credentials.email);
    await anonymousPage.getByLabel("Contraseña").fill(credentials.password);
    await anonymousPage.getByRole("button", { name: "Iniciar sesión" }).click();

    await expect(anonymousPage).toHaveURL(/\/dashboard/);

    await context.close();
  });
});
