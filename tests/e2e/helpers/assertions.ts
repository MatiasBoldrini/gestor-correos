import { expect, type Page } from "@playwright/test";

export async function expectSuccessToast(page: Page): Promise<void> {
  await expect(page.locator('[data-sonner-toast][data-type="success"]').first()).toBeVisible();
}

export async function expectUrlContains(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(path));
}
