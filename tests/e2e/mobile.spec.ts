import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

for (const mode of ['reaction', 'math', 'stroop', 'memory', 'typing']) {
  test(`mobile touch flow: ${mode}`, async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
    await page.getByLabel('任务模式').selectOption(mode);
    await page.getByRole('button', { name: /开始唤醒/ }).tap();
    await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
    if (mode === 'reaction') {
      await page.getByRole('button', { name: '等待绿色' }).tap();
      await expect(page.getByRole('status')).toContainText('Too early');
      await expect(page.getByRole('button', { name: '现在点击' })).toBeVisible();
      await page.getByRole('button', { name: '现在点击' }).tap();
    } else if (mode === 'math') {
      const [left, op, right] = (await page.locator('.task-prompt').innerText()).split(' ');
      const a = Number(left),
        b = Number(right);
      const answer = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      await page.getByLabel('口算答案').tap();
      await page.getByLabel('口算答案').fill(String(answer));
      await page.getByRole('button', { name: /提交/ }).tap();
    } else if (mode === 'stroop') {
      const css = await page.locator('.stroop-word').getAttribute('class');
      const label = css!.includes('color-red')
        ? '红色'
        : css!.includes('color-green')
          ? '绿色'
          : css!.includes('color-blue')
            ? '蓝色'
            : '黄色';
      await page.getByRole('button', { name: new RegExp(label) }).tap();
    } else if (mode === 'memory') {
      const target = await page.locator('.memory-string').innerText();
      await expect(page.getByLabel('记忆数字')).toBeEnabled();
      await page.getByLabel('记忆数字').tap();
      await page.getByLabel('记忆数字').fill(target);
      await page.getByRole('button', { name: /提交/ }).tap();
    } else {
      const phrase = await page.locator('.typing-prompt').innerText();
      await page.getByLabel('输入英文词组').tap();
      await page.getByLabel('输入英文词组').fill(phrase);
    }
    await expect
      .poll(async () =>
        page.evaluate(
          (mode) =>
            JSON.parse(localStorage.getItem('stay-awake:v1')!).active.metrics[mode]?.correct,
          mode,
        ),
      )
      .toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/task-mobile-${mode}.png`, fullPage: true });
    await page.getByRole('button', { name: /结束本次/ }).tap();
    await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
    await page.getByRole('button', { name: /返回首页/ }).tap();
    await expect(page.getByRole('button', { name: /仍然困/ })).toBeEnabled();
  });
}
