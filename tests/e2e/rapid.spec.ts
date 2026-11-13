import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
for (const mode of ['capture', 'direction', 'search']) {
  test(`rapid ${mode}: keyboard, touch, timeout and central deadline`, async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByLabel('任务模式').selectOption(mode);
    await page.getByRole('button', { name: '30s', exact: true }).click();
    await page.getByRole('button', { name: /开始唤醒/ }).tap();
    await expect(page.locator('.task')).toBeVisible();
    for (let index = 0; index < 5; index++) {
      if (mode === 'capture') {
        const target = page.locator('.capture-cell.target');
        const key = await target.locator('.cell-key').innerText();
        if (index % 2) await target.tap();
        else await page.keyboard.press(key);
      } else if (mode === 'search') {
        const symbols = await page.locator('.search-symbol').allTextContents();
        const odd = symbols.findIndex((symbol) => symbols.filter((s) => s === symbol).length === 1);
        if (index % 2) await page.locator('.search-cell').nth(odd).tap();
        else await page.keyboard.press(String(odd + 1));
      } else {
        const prompt = page.locator('.direction-arrow');
        const rule = await page.locator('.rule-label').innerText();
        const glyph = await prompt.innerText();
        let label = ({ '↑': '上', '→': '右', '↓': '下', '←': '左' } as Record<string, string>)[
          glyph
        ];
        if (rule.includes('位置')) {
          const position = await prompt.evaluate((element) => {
            const style = getComputedStyle(element);
            return { row: style.gridRowStart, column: style.gridColumnStart };
          });
          label =
            position.row === '1'
              ? '上'
              : position.row === '3'
                ? '下'
                : position.column === '1'
                  ? '左'
                  : '右';
        }
        if (index % 2) await page.getByRole('button', { name: label, exact: true }).tap();
        else
          await page.keyboard.press(
            (
              { 上: 'ArrowUp', 右: 'ArrowRight', 下: 'ArrowDown', 左: 'ArrowLeft' } as Record<
                string,
                string
              >
            )[label],
          );
      }
      await expect
        .poll(() =>
          page.evaluate(
            (mode) =>
              JSON.parse(localStorage.getItem('stay-awake:v1')!).active.metrics[mode]?.correct,
            mode,
          ),
        )
        .toBe(index + 1);
      await page.clock.runFor(160);
    }
    await page.screenshot({ path: `test-results/rapid-${mode}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.clock.fastForward(4000);
    await expect
      .poll(() =>
        page.evaluate(
          (mode) =>
            JSON.parse(localStorage.getItem('stay-awake:v1')!).active.metrics[mode]?.attempts,
          mode,
        ),
      )
      .toBe(6);
    await page.clock.fastForward(30_000);
    await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
    expect(await page.locator('.task').count()).toBe(0);
  });
}
