import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData } from "../helpers/test-data";

test.describe("@smoke operador - rebotes core", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("escanea rebotes mock y ejecuta limpieza seleccionada", async ({ page }) => {
    await page.goto("/bounces");
    await expect(page.getByRole("heading", { name: "Rebotes" })).toBeVisible();

    await page.getByRole("button", { name: "Escanear rebotes" }).click();
    await expect(page.getByText("Escaneo completado")).toBeVisible();

    const rowEmail = "matias.e2e@example.com";
    await expect(page.getByText(rowEmail)).toBeVisible();

    await page
      .getByRole("checkbox", { name: `Seleccionar rebote ${rowEmail}` })
      .check();
    await page
      .getByRole("button", { name: "Eliminar contactos y mandar a papelera" })
      .click();

    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Limpieza completada")).toBeVisible();
  });
});
