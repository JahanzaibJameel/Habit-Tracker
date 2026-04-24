# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: habits.e2e.ts >> Performance >> should handle large number of habits
- Location: src\__tests__\e2e\habits.e2e.ts:171:7

# Error details

```
TimeoutError: page.click: Timeout 10000ms exceeded.
Call log:
  - waiting for locator('[data-testid="add-habit-button"]')

```

# Test source

```ts
  74  |     await submitHabitForm(page);
  75  | 
  76  |     // Edit the habit
  77  |     await page.click('[data-testid="edit-habit-Reading"]');
  78  |     await page.fill('[data-testid="habit-name-input"]', 'Daily Reading');
  79  |     await submitHabitForm(page);
  80  | 
  81  |     // Verify habit was updated
  82  |     await expect(page.locator('[data-testid="habit-list"]')).toContainText('Daily Reading');
  83  |   });
  84  | 
  85  |   test('should delete habit', async ({ page }) => {
  86  |     // Create a habit first
  87  |     await page.click('[data-testid="add-habit-button"]');
  88  |     await page.fill('[data-testid="habit-name-input"]', 'Meditation');
  89  |     await submitHabitForm(page);
  90  | 
  91  |     // Delete the habit
  92  |     await page.click('[data-testid="delete-habit-Meditation"]');
  93  |     await confirmDelete(page);
  94  | 
  95  |     // Verify habit was deleted
  96  |     await expect(page.locator('[data-testid="habit-list"]')).not.toContainText('Meditation');
  97  |   });
  98  | 
  99  |   test('should show analytics dashboard', async ({ page }) => {
  100 |     // Navigate to analytics
  101 |     await page.click('[data-testid="analytics-tab"]');
  102 | 
  103 |     // Verify analytics components are visible
  104 |     await expect(page.locator('[data-testid="completion-rate"]')).toBeVisible();
  105 |     await expect(page.locator('[data-testid="habit-streaks"]')).toBeVisible();
  106 |     await expect(page.locator('[data-testid="category-breakdown"]')).toBeVisible();
  107 |   });
  108 | 
  109 |   test('should handle drag and drop reordering', async ({ page }) => {
  110 |     // Create multiple habits
  111 |     const habits = ['Habit 1', 'Habit 2', 'Habit 3'];
  112 | 
  113 |     for (const habit of habits) {
  114 |       await page.click('[data-testid="add-habit-button"]');
  115 |       await page.fill('[data-testid="habit-name-input"]', habit);
  116 |       await submitHabitForm(page);
  117 |     }
  118 | 
  119 |     // Get initial order
  120 |     const initialOrder = await page.locator('[data-testid="habit-item"]').allInnerTexts();
  121 | 
  122 |     // Drag first habit to last position
  123 |     const firstHabit = page.locator('[data-testid="habit-item"]').first();
  124 |     const lastHabit = page.locator('[data-testid="habit-item"]').last();
  125 | 
  126 |     await dragHabitCard(page, firstHabit, lastHabit);
  127 | 
  128 |     // Verify order changed
  129 |     const newOrder = await page.locator('[data-testid="habit-item"]').allInnerTexts();
  130 |     expect(newOrder).not.toEqual(initialOrder);
  131 |   });
  132 | });
  133 | 
  134 | test.describe('Responsive Design', () => {
  135 |   test('should work on mobile devices', async ({ page }) => {
  136 |     await page.setViewportSize({ width: 375, height: 667 });
  137 |     await page.goto('/');
  138 | 
  139 |     // Verify mobile layout
  140 |     await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  141 |     await expect(page.locator('[data-testid="habit-list"]')).toBeVisible();
  142 | 
  143 |     // Test habit creation on mobile
  144 |     await page.click('[data-testid="add-habit-button"]');
  145 |     await page.fill('[data-testid="habit-name-input"]', 'Mobile Habit');
  146 |     await submitHabitForm(page);
  147 | 
  148 |     await expect(page.locator('[data-testid="habit-list"]')).toContainText('Mobile Habit');
  149 |   });
  150 | 
  151 |   test('should work on tablet devices', async ({ page }) => {
  152 |     await page.setViewportSize({ width: 768, height: 1024 });
  153 |     await page.goto('/');
  154 | 
  155 |     // Verify tablet layout
  156 |     await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  157 |     await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
  158 |   });
  159 | });
  160 | 
  161 | test.describe('Performance', () => {
  162 |   test('should load quickly', async ({ page }) => {
  163 |     const startTime = Date.now();
  164 |     await page.goto('/');
  165 |     const loadTime = Date.now() - startTime;
  166 | 
  167 |     // Verify page loads within 3 seconds
  168 |     expect(loadTime).toBeLessThan(5000);
  169 |   });
  170 | 
  171 |   test('should handle large number of habits', async ({ page }) => {
  172 |     // Create a substantial set of habits in dev mode
  173 |     for (let i = 0; i < 20; i++) {
> 174 |       await page.click('[data-testid="add-habit-button"]');
      |                  ^ TimeoutError: page.click: Timeout 10000ms exceeded.
  175 |       await page.fill('[data-testid="habit-name-input"]', `Habit ${i}`);
  176 |       await submitHabitForm(page);
  177 |     }
  178 | 
  179 |     // Verify performance doesn't degrade significantly
  180 |     const startTime = Date.now();
  181 |     await page.click('[data-testid="analytics-tab"]');
  182 |     const responseTime = Date.now() - startTime;
  183 | 
  184 |     expect(responseTime).toBeLessThan(2000);
  185 |   });
  186 | });
  187 | 
  188 | test.describe('Error Handling', () => {
  189 |   test('should handle offline state gracefully', async ({ page }) => {
  190 |     await page.goto('/');
  191 | 
  192 |     await page.evaluate(() => {
  193 |       Object.defineProperty(window.navigator, 'onLine', {
  194 |         configurable: true,
  195 |         get: () => false,
  196 |       });
  197 |       window.dispatchEvent(new Event('offline'));
  198 |     });
  199 | 
  200 |     await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  201 |     await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
  202 |   });
  203 | 
  204 |   test('should handle invalid input', async ({ page }) => {
  205 |     await page.goto('/');
  206 | 
  207 |     // Try to create habit with invalid data
  208 |     await page.click('[data-testid="add-habit-button"]');
  209 |     await page.fill('[data-testid="habit-name-input"]', ''); // Empty name
  210 |     await submitHabitForm(page);
  211 | 
  212 |     // Verify validation error
  213 |     await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  214 |   });
  215 | });
  216 | 
```