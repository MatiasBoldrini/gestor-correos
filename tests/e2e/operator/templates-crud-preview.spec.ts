import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";

test.describe("@smoke operador - plantillas CRUD y preview", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("crea, previsualiza, edita y elimina una plantilla", async ({ page }) => {
    const templateName = uniqueValue("Plantilla E2E");
    const subject = "Hola {{FirstName}} desde {{Company}}";
    const html = "<html><body><h1>Hola {{FirstName}}</h1><p>Empresa: {{Company}}</p></body></html>";

    await page.goto("/templates");
    await expect(page.getByRole("heading", { name: "Plantillas" })).toBeVisible();

    // Crear plantilla
    await page.getByRole("button", { name: "Nueva plantilla" }).click();
    await page.getByLabel(/^Nombre/).fill(templateName);
    await page.getByLabel(/^Asunto/).fill(subject);
    await page.getByLabel(/^Contenido HTML/).fill(html);
    await page.getByRole("button", { name: "Crear" }).click();
    await expect(page.getByText("Plantilla creada")).toBeVisible();

    const row = page.locator("tr", { hasText: templateName });
    await expect(row).toBeVisible();

    // Preview
    await row.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Previsualizar" }).click();
    await expect(page.getByText(`Preview: ${templateName}`)).toBeVisible();
    await expect(page.getByText("Asunto:")).toBeVisible();
    await page.getByRole("button", { name: "Cerrar" }).click();

    // Editar
    await row.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Editar" }).click();
    await page.getByLabel(/^Asunto/).fill("[EDIT] Hola {{FirstName}}");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Plantilla actualizada")).toBeVisible();

    // Eliminar
    await row.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Eliminar" }).click();
    await page.getByRole("button", { name: /^Eliminar$/ }).click();
    await expect(page.getByText("Plantilla eliminada")).toBeVisible();
  });
});
