import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData } from "../helpers/test-data";

test.describe("operador - validaciones y errores de formularios", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("valida email inválido al crear contacto", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Nuevo contacto" }).click();
    await page.getByLabel(/^Email/).fill("email-invalido");
    await page.getByRole("button", { name: "Crear" }).click();

    await expect(page.getByText("Email inválido")).toBeVisible();
  });

  test("exige asunto y HTML al crear plantilla", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: "Nueva plantilla" }).click();
    await page.getByLabel(/^Nombre/).fill("Plantilla inválida E2E");
    await page.getByRole("button", { name: "Crear" }).click();

    await expect(page.getByText("El asunto es obligatorio")).toBeVisible();
    await expect(page.getByText("El contenido HTML es obligatorio")).toBeVisible();
  });

  test("muestra error por campos faltantes al agregar cuenta de email", async ({
    page,
  }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: "Agregar cuenta" }).click();
    await page.getByRole("button", { name: "Verificar y guardar" }).click();

    await expect(page.getByText("Completá todos los campos obligatorios")).toBeVisible();
  });
});
