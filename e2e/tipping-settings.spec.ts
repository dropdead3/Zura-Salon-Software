import { test, expect } from '@playwright/test';

test.describe('Tipping Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/admin/settings?category=terminals&subtab=tipping');
    await page.waitForLoadState('networkidle');
  });

  test('should toggle tipping on and off', async ({ page }) => {
    const masterToggle = page.locator('text=Tipping').locator('..').locator('..').getByRole('switch').first();
    if (await masterToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const wasChecked = await masterToggle.getAttribute('data-state') === 'checked';
      await masterToggle.click();
      await page.waitForTimeout(1000);
      const nowChecked = await masterToggle.getAttribute('data-state') === 'checked';
      expect(nowChecked).not.toBe(wasChecked);
      // Toggle back
      await masterToggle.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should edit tip percentages and persist on blur', async ({ page }) => {
    const inputs = page.locator('input[inputmode="numeric"]');
    const count = await inputs.count();
    if (count < 3) {
      test.skip(true, 'Tip percentage inputs not found');
      return;
    }

    // Edit first percentage
    const firstInput = inputs.nth(0);
    await firstInput.click();
    await firstInput.fill('18');
    await firstInput.blur();
    await page.waitForTimeout(1500);

    // Refresh and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const refreshedInput = page.locator('input[inputmode="numeric"]').nth(0);
    await expect(refreshedInput).toHaveValue('18', { timeout: 5000 });

    // Restore to 20
    await refreshedInput.click();
    await refreshedInput.fill('20');
    await refreshedInput.blur();
    await page.waitForTimeout(1000);
  });

  test('should edit threshold amount on blur', async ({ page }) => {
    // Enable fixed threshold if not enabled
    const thresholdToggle = page.locator('text=Fixed Tip Threshold').locator('..').locator('..').getByRole('switch').first();
    if (await thresholdToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      const state = await thresholdToggle.getAttribute('data-state');
      if (state !== 'checked') {
        await thresholdToggle.click();
        await page.waitForTimeout(1000);
      }

      const thresholdInput = page.locator('input[type="number"]').first();
      if (await thresholdInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await thresholdInput.click();
        await thresholdInput.fill('50');
        await thresholdInput.blur();
        await page.waitForTimeout(1500);

        // Refresh and verify
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const refreshedThreshold = page.locator('input[type="number"]').first();
        await expect(refreshedThreshold).toHaveValue('50', { timeout: 5000 });

        // Restore
        await refreshedThreshold.click();
        await refreshedThreshold.fill('25');
        await refreshedThreshold.blur();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should toggle include retail and saved cards options', async ({ page }) => {
    const retailSwitch = page.locator('#include-retail');
    const savedCardsSwitch = page.locator('#saved-cards');

    if (await retailSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await retailSwitch.click();
      await page.waitForTimeout(1000);
      // Toggle back
      await retailSwitch.click();
      await page.waitForTimeout(1000);
    }

    if (await savedCardsSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
      await savedCardsSwitch.click();
      await page.waitForTimeout(1000);
      // Toggle back
      await savedCardsSwitch.click();
      await page.waitForTimeout(1000);
    }
  });
});
