import { test, expect } from '@playwright/test';

test('optional feedback persists, can change, and does not change usage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /开始唤醒/ }).click();
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  const before = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stay-awake:v1')!).records.at(-1),
  );
  await page.getByRole('button', { name: '好了一点', exact: true }).click();
  await expect(page.getByRole('button', { name: '好了一点', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '没什么帮助', exact: true }).click();
  await expect(page.getByRole('button', { name: '没什么帮助', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  const after = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('stay-awake:v1')!).records.at(-1),
  );
  expect(after).toEqual({ ...before, feedback: 'none' });
  await page.getByRole('button', { name: '设置与统计' }).click();
  await expect(page.locator('.metric-row').filter({ hasText: '没什么帮助' })).toContainText('1 次');
});
