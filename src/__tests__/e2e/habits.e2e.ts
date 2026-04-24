import { test, expect } from '@playwright/test';

async function submitHabitForm(page: import('@playwright/test').Page) {
  await page
    .locator('[data-testid="save-habit-button"]')
    .evaluate((button: HTMLButtonElement) => button.click());
}

async function confirmDelete(page: import('@playwright/test').Page) {
  await page
    .locator('[data-testid="confirm-delete-button"]')
    .evaluate((button: HTMLButtonElement) => button.click());
}

async function dragHabitCard(
  page: import('@playwright/test').Page,
  source: import('@playwright/test').Locator,
  target: import('@playwright/test').Locator
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error('Unable to determine habit card positions for drag and drop.');
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
}

test.describe('Habit Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new habit', async ({ page }) => {
    // Click the add habit button
    await page.click('[data-testid="add-habit-button"]');

    // Fill in habit details
    await page.fill('[data-testid="habit-name-input"]', 'Test Habit');
    await page.selectOption('[data-testid="habit-category-select"]', 'health');
    await page.fill('[data-testid="habit-target-input"]', '5');

    // Save the habit
    await submitHabitForm(page);

    // Verify habit appears in the list
    await expect(page.locator('[data-testid="habit-list"]')).toContainText('Test Habit');
  });

  test('should mark habit as complete', async ({ page }) => {
    // Create a habit first
    await page.click('[data-testid="add-habit-button"]');
    await page.fill('[data-testid="habit-name-input"]', 'Daily Exercise');
    await page.selectOption('[data-testid="habit-category-select"]', 'fitness');
    await submitHabitForm(page);

    // Mark habit as complete
    await page.click('[data-testid="habit-checkbox-Daily Exercise"]');

    // Verify completion
    await expect(page.locator('[data-testid="habit-checkbox-Daily Exercise"]')).toBeChecked();
  });

  test('should edit existing habit', async ({ page }) => {
    // Create a habit first
    await page.click('[data-testid="add-habit-button"]');
    await page.fill('[data-testid="habit-name-input"]', 'Reading');
    await submitHabitForm(page);

    // Edit the habit
    await page.click('[data-testid="edit-habit-Reading"]');
    await page.fill('[data-testid="habit-name-input"]', 'Daily Reading');
    await submitHabitForm(page);

    // Verify habit was updated
    await expect(page.locator('[data-testid="habit-list"]')).toContainText('Daily Reading');
  });

  test('should delete habit', async ({ page }) => {
    // Create a habit first
    await page.click('[data-testid="add-habit-button"]');
    await page.fill('[data-testid="habit-name-input"]', 'Meditation');
    await submitHabitForm(page);

    // Delete the habit
    await page.click('[data-testid="delete-habit-Meditation"]');
    await confirmDelete(page);

    // Verify habit was deleted
    await expect(page.locator('[data-testid="habit-list"]')).not.toContainText('Meditation');
  });

  test('should show analytics dashboard', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="analytics-tab"]');

    // Verify analytics components are visible
    await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
    await expect(page.locator('[data-testid="habit-streaks"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-breakdown"]')).toBeVisible();
  });

  test('should handle drag and drop reordering', async ({ page }) => {
    // Create multiple habits
    const habits = ['Habit 1', 'Habit 2', 'Habit 3'];

    for (const habit of habits) {
      await page.click('[data-testid="add-habit-button"]');
      await page.fill('[data-testid="habit-name-input"]', habit);
      await submitHabitForm(page);
    }

    // Get initial order
    const initialOrder = await page.locator('[data-testid="habit-item"]').allInnerTexts();

    // Drag first habit to last position
    const firstHabit = page.locator('[data-testid="habit-item"]').first();
    const lastHabit = page.locator('[data-testid="habit-item"]').last();

    await dragHabitCard(page, firstHabit, lastHabit);

    // Verify order changed
    const newOrder = await page.locator('[data-testid="habit-item"]').allInnerTexts();
    expect(newOrder).not.toEqual(initialOrder);
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="habit-list"]')).toBeVisible();

    // Test habit creation on mobile
    await page.click('[data-testid="add-habit-button"]');
    await page.fill('[data-testid="habit-name-input"]', 'Mobile Habit');
    await submitHabitForm(page);

    await expect(page.locator('[data-testid="habit-list"]')).toContainText('Mobile Habit');
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Verify tablet layout
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;

    // Verify page loads within 3 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should handle large number of habits', async ({ page }) => {
    // Create a substantial set of habits in dev mode
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="add-habit-button"]');
      await page.fill('[data-testid="habit-name-input"]', `Habit ${i}`);
      await submitHabitForm(page);
    }

    // Verify performance doesn't degrade significantly
    const startTime = Date.now();
    await page.click('[data-testid="analytics-tab"]');
    const responseTime = Date.now() - startTime;

    expect(responseTime).toBeLessThan(2000);
  });
});

test.describe('Error Handling', () => {
  test('should handle offline state gracefully', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => {
      Object.defineProperty(window.navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event('offline'));
    });

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  });

  test('should handle invalid input', async ({ page }) => {
    await page.goto('/');

    // Try to create habit with invalid data
    await page.click('[data-testid="add-habit-button"]');
    await page.fill('[data-testid="habit-name-input"]', ''); // Empty name
    await submitHabitForm(page);

    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });
});
