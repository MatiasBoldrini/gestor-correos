import { test, expect } from "@playwright/test";
import { resetAndSeedOperatorData, uniqueValue } from "../helpers/test-data";
import { getSupabaseAdminClient } from "../helpers/supabase-admin";

async function insertManyContacts(total: number): Promise<void> {
  const client = getSupabaseAdminClient();
  const rows = Array.from({ length: total }, (_, i) => ({
    email: `bulk-contact-${i}-${Date.now()}@example.com`,
    first_name: `Bulk${i}`,
    last_name: "E2E",
    company: "Bulk Company",
    position: "Analyst",
    subscription_status: "active",
    suppression_status: "none",
  }));

  const { error } = await client.from("contacts").insert(rows);
  if (error) {
    throw new Error(`No se pudieron insertar contactos para paginación: ${error.message}`);
  }
}

async function insertManyBounces(total: number): Promise<void> {
  const client = getSupabaseAdminClient();
  const rows = Array.from({ length: total }, (_, i) => ({
    bounced_email: `bulk-bounce-${i}@example.com`,
    reason: "550 5.1.1 User unknown",
    gmail_message_id: `bulk-bounce-msg-${i}-${Date.now()}`,
    gmail_permalink: `https://mail.google.com/mail/u/0/#inbox/bulk-bounce-msg-${i}`,
  }));

  const { error } = await client.from("bounce_events").insert(rows);
  if (error) {
    throw new Error(`No se pudieron insertar rebotes para paginación: ${error.message}`);
  }
}

test.describe("operador - paginación", () => {
  test.beforeEach(async () => {
    await resetAndSeedOperatorData();
  });

  test("pagina contactos correctamente", async ({ page }) => {
    await insertManyContacts(35);

    await page.goto("/contacts");
    await expect(page.getByText(/Página 1 de [2-9]/)).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente contactos" }).click();
    await expect(page.getByText(/Página 2 de [2-9]/)).toBeVisible();
  });

  test("pagina drafts de campaña cuando hay más de 25 destinatarios", async ({ page }) => {
    await insertManyContacts(35);

    await page.goto("/campaigns");
    await page.getByRole("button", { name: "Nueva campaña" }).click();
    await page.getByLabel("Nombre de campaña *").fill(uniqueValue("Campaña Paginación"));
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByRole("button", { name: "Crear campaña" }).click();

    await expect(page).toHaveURL(/\/campaigns\/.+/);
    await page.getByRole("button", { name: "Preparar destinatarios" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText(/Se prepararon \d+ destinatarios/)).toBeVisible();

    await expect(page.getByText(/Página 1 de [2-9]/)).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente drafts" }).click();
    await expect(page.getByText(/Página 2 de [2-9]/)).toBeVisible();
  });

  test("pagina rebotes correctamente", async ({ page }) => {
    await insertManyBounces(35);

    await page.goto("/bounces");
    await expect(page.getByText(/Página 1 de [2-9]/)).toBeVisible();
    await page.getByRole("button", { name: "Página siguiente rebotes" }).click();
    await expect(page.getByText(/Página 2 de [2-9]/)).toBeVisible();
  });
});
