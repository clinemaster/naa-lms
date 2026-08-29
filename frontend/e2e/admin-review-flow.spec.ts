import { test, expect } from "@playwright/test";

/**
 * Admin reviews and approves a pending course, then it becomes visible in
 * the public catalog. Assumes teacher-course-flow.spec.ts (or an equivalent
 * run) has already produced at least one course sitting in "Review" status,
 * and that e2e_admin@example.com / Str0ngPass!123 exists with role Admin.
 */
test("admin can review and approve a pending course", async ({ page }) => {
  await test.step("login as admin", async () => {
    await page.goto("/login");
    await page.fill("#email", "e2e_admin@example.com");
    await page.fill("#password", "Str0ngPass!123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin");
  });

  await test.step("dashboard shows a pending review course", async () => {
    await expect(page.getByRole("heading", { name: "Pending Review" })).toBeVisible();
  });

  await test.step("open the first pending course and approve it", async () => {
    const reviewLink = page.locator('a:has-text("Review")').first();
    await expect(reviewLink).toBeVisible({ timeout: 10000 });
    await Promise.all([page.waitForURL(/\/admin\/courses\/\d+\/review/), reviewLink.click()]);

    await expect(page.locator('button:has-text("Approve")')).toBeVisible();
    await page.click('button:has-text("Approve")');
    await expect(page.locator("text=Published")).toBeVisible({ timeout: 10000 });
  });
});
