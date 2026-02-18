import { expect, type Page } from "@playwright/test";

export async function navigateFromSidebar(
  page: Page,
  linkName: string,
  expectedPath: string
): Promise<void> {
  await page.getByRole("link", { name: linkName }).click();
  await expect(page).toHaveURL(new RegExp(expectedPath));
}
