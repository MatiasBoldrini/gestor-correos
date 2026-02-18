import { expect, test } from "@playwright/test";
import { resetE2EDatabase } from "../helpers/db-reset";
import { assertRequiredE2EEnv, getE2EOperatorCredentials } from "../helpers/env";
import { seedBaseE2EData } from "../helpers/seed";
import { ensureOperatorUser } from "../helpers/supabase-admin";

test("preparar estado de autenticación de operador", async ({ page }) => {
  assertRequiredE2EEnv();

  const credentials = getE2EOperatorCredentials();
  const operator = await ensureOperatorUser();

  await resetE2EDatabase();
  await seedBaseE2EData({
    operatorUserId: operator.id,
    operatorEmail: operator.email,
  });

  await page.goto("/login");
  await page.getByRole("button", { name: "Iniciar sesión con email" }).click();
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await page.context().storageState({ path: "tests/e2e/.auth/operator.json" });
});
