import { expect, test } from "@playwright/test";

test("name a trip on the landing page and create it", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Nine friends. One trip.");

  await page.getByLabel("Start by naming it").fill("Ski Trip 2027");
  await expect(page.getByText("celtivo.com/trip/ski-trip-2027")).toBeVisible();

  await page.getByRole("button", { name: "Create trip →" }).first().click();
  await expect(page).toHaveURL(/\/trips\/new$/);
  await expect(page.getByRole("textbox", { name: "Trip name" })).toHaveValue("Ski Trip 2027");

  await page.getByRole("button", { name: "Create Ski Trip 2027" }).click();
  await expect(page.getByText("https://celtivo.com/join/ski-trip-2027")).toBeVisible();
});

test("the landing page has no horizontal scroll", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
