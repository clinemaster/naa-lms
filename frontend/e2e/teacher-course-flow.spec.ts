import { test, expect } from "@playwright/test";
import path from "path";

/**
 * Exercises the teacher course-authoring golden path against a real Django
 * backend: create a course, fill curriculum, upload a real lesson video via
 * the resumable chunked-upload endpoints, and submit for review.
 *
 * Requires:
 *  - Django API running (see golden-path.spec.ts).
 *  - A teacher account: e2e_teacher@example.com / Str0ngPass!123 with role
 *    Teacher and a Teacher profile (create once via Django shell, see
 *    project docs).
 */
test("teacher can create a course, upload a lesson video, and submit for review", async ({ page }) => {
  const videoPath = path.resolve("e2e/fixtures/sample-lesson.mp4");
  const imagePath = path.resolve("e2e/fixtures/sample-cover.jpg");

  await test.step("login as teacher", async () => {
    await page.goto("/login");
    await page.fill("#email", "e2e_teacher@example.com");
    await page.fill("#password", "Str0ngPass!123");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/teacher");
  });

  await test.step("go to course builder", async () => {
    await Promise.all([page.waitForURL("**/teacher/courses/new"), page.click('a:has-text("Create Course")')]);
  });

  await test.step("fill course info, image, and lesson 1 with video", async () => {
    const title = `E2E Course ${Date.now()}`;
    await page.fill("#title", title);
    await page.fill("#description", "A course created end-to-end by an automated Playwright test.");

    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();

    await page.locator('input[type="file"][accept*="image"]').setInputFiles(imagePath);
    // Selecting a course image opens the crop/position dialog; confirm it to
    // produce the actual staged file.
    await expect(page.locator("text=Position Course Image")).toBeVisible();
    await page.click('button:has-text("Use This Image")');
    await expect(page.locator("text=Position Course Image")).not.toBeVisible();

    await page.fill('input[placeholder="Lesson title"]', "Lesson One: Introduction");
    // Selecting the file only stages it client-side; the resumable upload
    // itself (init -> chunk -> complete) kicks off on Save/Submit below.
    await page.locator('input[type="file"][accept*="video"]').first().setInputFiles(videoPath);
  });

  await test.step("submit for review (uploads the video, then flips status)", async () => {
    await page.click('button:has-text("Submit for Review")');
    await page.waitForURL(/\/teacher\/courses\/\d+\/edit/, { timeout: 30000 });
    await expect(page.locator("text=Review")).toBeVisible();
    await expect(page.locator("text=Video uploaded")).toBeVisible();
  });
});
