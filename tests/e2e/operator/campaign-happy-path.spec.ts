import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";

test.describe("@smoke operador - campaña happy path", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("crea campaña, prepara snapshot, prueba envío y controla estados", async ({
    page,
  }) => {
    const campaignName = uniqueValue("Campaña E2E");

    await page.goto("/campaigns");
    await expect(page.getByRole("heading", { name: "Campañas" })).toBeVisible();

    // Crear campaña desde wizard
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    await page.getByLabel("Nombre de campaña *").fill(campaignName);
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Crear campaña" }).click();

    await expect(page).toHaveURL(/\/campaigns\/.+/);
    await expect(page.getByRole("heading", { name: campaignName })).toBeVisible();

    // Preparar destinatarios (snapshot)
    await page.getByRole("button", { name: "Preparar destinatarios" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Se prepararon \d+ destinatarios/)).toBeVisible();

    // Test send real (mockeado)
    await page.getByRole("button", { name: "Enviar prueba" }).click();
    await page.getByLabel("Email de destino").fill("qa.test.send@example.com");
    await page.getByRole("button", { name: /^Enviar prueba$/ }).click();
    await expect(page.getByText("Email de prueba enviado a qa.test.send@example.com")).toBeVisible();

    // Iniciar envío
    await page.getByRole("button", { name: "Iniciar envío" }).click();
    await page.getByRole("button", { name: /^Iniciar$/ }).click();
    await expect(page.getByText("Campaña iniciada. El envío comenzará en breve.")).toBeVisible();
    await expect(page.getByText("Enviando")).toBeVisible();

    // Pausar
    await page.getByRole("button", { name: "Pausar" }).click();
    await expect(page.getByText("Campaña pausada")).toBeVisible();
    await expect(page.getByText("Pausada")).toBeVisible();

    // Reanudar
    await page.getByRole("button", { name: "Reanudar" }).click();
    await page.getByRole("button", { name: /^Reanudar$/ }).click();
    await expect(page.getByText("Campaña reanudada. El envío continuará en breve.")).toBeVisible();

    // Cancelar
    await page.getByRole("button", { name: /^Cancelar$/ }).click();
    await page.getByRole("button", { name: "Cancelar campaña" }).click();
    await expect(page.getByText("Campaña cancelada")).toBeVisible();
    await expect(page.getByText("Cancelada")).toBeVisible();
  });
});
