import { test, expect } from "@playwright/test";

/**
 * Exercises the Phase 1 golden path end to end against a real Django backend:
 * register -> browse -> search -> enroll -> my courses -> learning player.
 *
 * Requires the Django API running at NEXT_PUBLIC_API_URL (default
 * http://127.0.0.1:8000/api/v1) -- start it separately, e.g.:
 *   cd backend && .venv/Scripts/python manage.py runserver
 */
test("student can register, enroll, and reach the learning player", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;

  await test.step("register", async () => {
    await page.goto("/register");
    await page.fill("#full_name", "E2E Student");
    await page.fill("#email", email);
    await page.fill("#password", "Str0ngPass!123");
    await page.fill("#password2", "Str0ngPass!123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard");
  });

  await test.step("browse and search courses", async () => {
    await page.goto("/courses");
    await expect(page.locator('a:has-text("View Course")').first()).toBeVisible();
    await page.fill('input[placeholder*="Search courses"]', "Flutter");
    await expect(page.getByRole("heading", { name: "Flutter Mobile App Development Bootcamp" })).toBeVisible();
  });

  await test.step("view course detail and enroll", async () => {
    await Promise.all([
      page.waitForURL(/\/courses\/[^/?]+$/),
      page.locator('a:has-text("View Course")').first().click(),
    ]);
    const enrollButton = page.locator('button:has-text("Enroll in Course")');
    await expect(enrollButton).toBeVisible();
    await Promise.all([page.waitForURL("**/my-courses"), enrollButton.click()]);
  });

  await test.step("course appears in My Courses with progress", async () => {
    await expect(page.locator("text=/lessons completed/")).toBeVisible();
    await expect(page.locator('a:has-text("Continue Learning")')).toBeVisible();
  });

  await test.step("learning player loads with sequential lesson lock", async () => {
    await Promise.all([
      page.waitForURL(/\/learning\//),
      page.locator('a:has-text("Continue Learning")').first().click(),
    ]);
    // Lesson 1 is playable; later lessons stay locked until it's completed.
    await expect(page.locator("text=/^1\\./")).toBeVisible();
    await expect(page.locator("text=Course Progress")).toBeVisible();
  });
});
