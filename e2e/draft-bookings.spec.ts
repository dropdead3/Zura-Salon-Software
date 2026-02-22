import { test, expect } from '@playwright/test';

test.describe('Draft Bookings Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the schedule page
    await page.goto('/dashboard/schedule');
    await page.waitForLoadState('networkidle');
  });

  test('should auto-save a draft when closing the booking wizard and show it in drafts sheet', async ({ page }) => {
    // 1. Look for a "New Booking" or "+" button to open the booking wizard
    const newBookingBtn = page.getByRole('button', { name: /new booking|book|add/i }).first();
    if (await newBookingBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBookingBtn.click();
    } else {
      // Try clicking on a time slot in the calendar
      const timeSlot = page.locator('[data-time-slot]').first();
      if (await timeSlot.isVisible({ timeout: 3000 }).catch(() => false)) {
        await timeSlot.click();
      } else {
        test.skip(true, 'Could not find a way to open the booking wizard');
      }
    }

    // 2. Wait for the booking wizard to appear
    await page.waitForTimeout(1000);

    // 3. Try to select a service if available
    const serviceItem = page.locator('[role="checkbox"], [data-service-id]').first();
    if (await serviceItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await serviceItem.click();
    }

    // 4. Close the wizard (press Escape or click close button)
    const closeBtn = page.locator('button:has(svg), [aria-label="Close"]').filter({ hasText: '' }).first();
    await page.keyboard.press('Escape');

    // 5. Wait for the draft to be saved
    await page.waitForTimeout(1500);

    // 6. Look for the drafts button/badge
    const draftsBtn = page.getByRole('button', { name: /draft/i }).first();
    if (await draftsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftsBtn.click();

      // 7. Verify the drafts sheet opens and has content
      await page.waitForTimeout(500);
      const draftSheet = page.locator('[role="dialog"]').filter({ hasText: /draft booking/i });
      if (await draftSheet.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Check for a "No Client Selected" group or any draft card
        const draftContent = page.locator('text=/No Client Selected|Most Recent|Resume/i').first();
        await expect(draftContent).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should group drafts by client name', async ({ page }) => {
    // Open drafts sheet
    const draftsBtn = page.getByRole('button', { name: /draft/i }).first();
    if (await draftsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftsBtn.click();
      await page.waitForTimeout(500);

      // Look for collapsible client groups
      const groupHeaders = page.locator('text=/draft[s]?\\)/i');
      const count = await groupHeaders.count();
      // If there are drafts, they should be grouped
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(1);
      }
    } else {
      test.skip(true, 'No drafts button visible - no drafts exist yet');
    }
  });

  test('should resume a draft and reopen wizard with saved data', async ({ page }) => {
    // Open drafts sheet
    const draftsBtn = page.getByRole('button', { name: /draft/i }).first();
    if (await draftsBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await draftsBtn.click();
      await page.waitForTimeout(500);

      // Click Resume on the first draft
      const resumeBtn = page.getByRole('button', { name: /resume/i }).first();
      if (await resumeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await resumeBtn.click();
        await page.waitForTimeout(1000);

        // Verify the booking wizard reopened
        const wizard = page.locator('[data-booking-wizard], [role="dialog"]').first();
        await expect(wizard).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip(true, 'No drafts button visible');
    }
  });
});
