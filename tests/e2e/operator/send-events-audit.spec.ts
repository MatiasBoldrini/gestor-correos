import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";
import { getSupabaseAdminClient } from "../helpers/supabase-admin";

test.describe("operador - auditoría de send events y permalink", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("muestra historial de envíos reales con permalink", async ({ page }) => {
    await page.goto("/campaigns");
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    await page.getByLabel("Nombre de campaña *").fill(uniqueValue("Campaña Auditoría"));
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Crear campaña" }).click();

    await expect(page).toHaveURL(/\/campaigns\/.+/);
    const campaignUrl = page.url();
    const campaignId = campaignUrl.split("/campaigns/")[1];

    await page.getByRole("button", { name: "Preparar destinatarios" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Se prepararon \d+ destinatarios/)).toBeVisible();

    const client = getSupabaseAdminClient();
    const { data: draft, error: draftError } = await client
      .from("draft_items")
      .select("id")
      .eq("campaign_id", campaignId)
      .limit(1)
      .single();

    if (draftError || !draft?.id) {
      throw new Error(`No se pudo obtener draft para auditoría E2E: ${draftError?.message}`);
    }

    const permalink = "https://mail.google.com/mail/u/0/#inbox/mock-audit-message-001";
    const { error: sendEventError } = await client.from("send_events").insert({
      campaign_id: campaignId,
      draft_item_id: draft.id,
      sent_at: new Date().toISOString(),
      gmail_message_id: "mock-audit-message-001",
      gmail_thread_id: "mock-audit-thread-001",
      gmail_permalink: permalink,
      status: "sent",
      error: null,
    });

    if (sendEventError) {
      throw new Error(`No se pudo insertar send_event para auditoría E2E: ${sendEventError.message}`);
    }

    await page.reload();
    await page.getByRole("button", { name: "Ver detalle avanzado" }).click();

    await expect(page.getByText("Historial de envíos reales")).toBeVisible();
    await expect(page.getByText("Enviado")).toBeVisible();

    const permalinkLink = page.locator(`a[href="${permalink}"]`).first();
    await expect(permalinkLink).toBeVisible();
  });
});
