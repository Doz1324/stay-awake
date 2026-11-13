import { test, expect } from '@playwright/test';

test('general-purpose copy and mobile controls work in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page).toHaveTitle('Stay Awake / 短时唤醒工具');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') {
      await page.getByRole('button', { name: '设置与统计' }).click();
      await page.getByRole('button', { name: '浅色', exact: true }).click();
      await page.getByRole('button', { name: '返回主界面' }).click();
    }
    await expect(page.locator('h1')).toHaveText('给注意力一个短暂重启。');
    const button = await page.locator('.start-button').boundingBox();
    expect(button!.y + button!.height).toBeLessThanOrEqual(844);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/redesign-${theme}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: /开始唤醒/ }).click();
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  for (const button of await page.locator('.feedback-options button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator('body')).not.toContainText('课堂');
});
