import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";

test.describe("@smoke operador - contactos CRUD", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("crea, edita, filtra y elimina un contacto", async ({ page }) => {
    const email = `${uniqueValue("contacto")}@example.com`;

    await page.goto("/contacts");
    await expect(page.getByRole("heading", { name: "Contactos" })).toBeVisible();

    // Crear
    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel("Nombre").fill("Operador");
    await page.getByLabel("Apellido").fill("E2E");
    await page.getByLabel("Empresa").fill("Empresa QA");
    await page.getByLabel("Cargo").fill("Analista");
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Contacto creado")).toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Filtro de búsqueda
    await page.getByPlaceholder("Buscar por email, nombre...").fill(email);
    await expect(page.getByRole("cell", { name: email })).toBeVisible();

    // Editar
    const row = page.locator("tr", { hasText: email });
    await row.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await page.getByLabel("Empresa").fill("Empresa QA Editada");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Contacto actualizado")).toBeVisible();
    await expect(page.getByText("Empresa QA Editada")).toBeVisible();

    // Eliminar
    await row.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: /^Eliminar$/ }).click();
    await expect(page.getByText("Contacto eliminado")).toBeVisible();
    await expect(page.getByRole("cell", { name: email })).toHaveCount(0);
  });
});
