import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";

test.describe("@smoke operador - settings core", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("actualiza límites, firma, cuenta email y sync de fuente", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();

    // Límites
    await page.getByRole("button", { name: "Editar límites de envío" }).click();
    await page.getByLabel("Cuota diaria (emails)").fill("120");
    await page.getByLabel("Delay mínimo (segundos)").fill("2");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Límites actualizados")).toBeVisible();

    // Firma
    await page.getByRole("button", { name: "Editar firma por defecto" }).click();
    await page
      .getByLabel("Firma HTML")
      .fill("<p>Firma E2E</p><p><strong>Equipo Operaciones</strong></p>");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Firma actualizada")).toBeVisible();
    await expect(page.getByText("Firma E2E")).toBeVisible();

    // Cuenta IMAP/SMTP mock
    const smtpEmail = `${uniqueValue("smtp") }@example.com`;
    await page.getByRole("button", { name: "Agregar cuenta" }).click();
    await page.getByLabel("Email de envío *").fill(smtpEmail);
    await page.getByLabel("Usuario *").fill(smtpEmail);
    await page.getByLabel("Contraseña *").fill("OperadorE2E!123");
    await page.getByRole("button", { name: "Verificar y guardar" }).click();
    await expect(page.getByText("Cuenta verificada y conectada correctamente")).toBeVisible();
    await expect(page.getByText(smtpEmail)).toBeVisible();

    // Fuente de Google Sheets mock + sync
    await page.getByRole("button", { name: "Agregar BD" }).click();
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.getByRole("button", { name: "[E2E] Base de datos principal" }).click();
    await page.getByRole("button", { name: "Crear fuente" }).click();
    await expect(page.getByText("Fuente creada: [E2E] Base de datos principal")).toBeVisible();

    await page.locator("select").first().selectOption({ index: 1 });
    await page.getByRole("button", { name: "Sincronizar ahora" }).click();
    await expect(page.getByText("Sincronización iniciada")).toBeVisible();
  });
});
