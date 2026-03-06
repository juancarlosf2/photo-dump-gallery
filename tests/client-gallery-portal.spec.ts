import { test, expect } from "@playwright/test";

const galleryUnavailableMessage =
  "This gallery link may be invalid, expired, or the gallery is no longer active.";

/**
 * Verification test for the Client Gallery Portal feature.
 * This test verifies the basic functionality of the client-facing gallery portal.
 */

test.describe("Client Gallery Portal", () => {
  test("should display gallery not available message for invalid share token", async ({ page }) => {
    await page.goto("/gallery/invalid-token-12345");

    await expect(page.getByRole("heading", { name: "Gallery Not Available" })).toBeVisible();
    await expect(page.getByText(galleryUnavailableMessage)).toBeVisible();
  });

  test("sign-in page should load for guests", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page).toHaveURL(/sign-in/);
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("dashboard should redirect guests to the unauthenticated gate", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/unauthenticated/);
    await expect(page.getByRole("heading", { name: "Authentication Required" })).toBeVisible();
  });
});

test.describe("Gallery UI Components", () => {
  test("client gallery page should keep rendering chrome on missing galleries", async ({ page }) => {
    await page.goto("/gallery/nonexistent-gallery");
    await expect(page.getByRole("heading", { name: "Gallery Not Available" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.locator("footer").first()).toBeVisible();
  });

  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("body")).toBeVisible();
  });
});
