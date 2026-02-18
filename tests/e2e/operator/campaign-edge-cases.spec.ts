import { test, expect, type Page } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";

async function createCampaignFromWizard(
  page: Page,
  campaignName: string,
  options?: { companyFilter?: string }
) {
  await page.goto("/campaigns");
  await page.getByRole("button", { name: "Nueva campaña" }).click();
  await page.getByLabel("Nombre de campaña *").fill(campaignName);
  await page.getByRole("button", { name: "Siguiente" }).click();

  if (options?.companyFilter) {
    await page.getByPlaceholder("Ej: Acme Corp").fill(options.companyFilter);
  }

  await page.getByRole("button", { name: "Siguiente" }).click();
  await page.getByRole("button", { name: "Crear campaña" }).click();
  await expect(page).toHaveURL(/\/campaigns\/.+/);
}

test.describe("operador - escenarios borde de campañas", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("muestra error cuando no hay destinatarios para snapshot", async ({ page }) => {
    await createCampaignFromWizard(page, uniqueValue("Campaña Sin Destino"), {
      companyFilter: "empresa-inexistente-e2e",
    });

    await page.getByRole("button", { name: "Preparar destinatarios" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    await expect(
      page.getByText("No hay contactos que coincidan con los filtros de la campaña")
    ).toBeVisible();
  });

  test("soporta regeneración force, include/exclude y retry de campaña", async ({
    page,
  }) => {
    await createCampaignFromWizard(page, uniqueValue("Campaña Edge"));

    await page.getByRole("button", { name: "Preparar destinatarios" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Se prepararon \d+ destinatarios/)).toBeVisible();

    // Regeneración force
    await page.getByRole("button", { name: "Volver a preparar" }).first().click();
    await page
      .getByLabel(/Confirmo que quiero reemplazar los \d+ destinatarios actuales/)
      .check();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Se prepararon \d+ destinatarios/)).toBeVisible();

    // Excluir manualmente un draft
    const firstDraftRow = page.locator("table tbody tr").first();
    await firstDraftRow.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await expect(page.getByText("Excluido:")).toBeVisible();

    // Incluir manualmente el draft excluido
    await page.getByRole("button", { name: "Excluidos" }).click();
    const excludedRow = page.locator("table tbody tr").first();
    await excludedRow.getByRole("button").click();
    await page.getByRole("menuitem", { name: "Incluir" }).click();
    await expect(page.getByText("Incluido:")).toBeVisible();

    // Iniciar y reintentar envío atascado
    await page.getByRole("button", { name: "Iniciar envío" }).click();
    await page.getByRole("button", { name: /^Iniciar$/ }).click();
    await expect(page.getByText("Campaña iniciada. El envío comenzará en breve.")).toBeVisible();

    await page.getByRole("button", { name: "Reintentar" }).click();
    await expect(page.getByText("Envío reprogramado. El tick se ejecutará en breve.")).toBeVisible();
  });
});
