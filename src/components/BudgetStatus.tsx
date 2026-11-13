import type { Budget } from '../session/budget';
import { Countdown } from './Countdown';

export function BudgetStatus({ budget, now }: { budget: Budget; now: number }) {
  return (
    <div className="budget-status">
      <div className="cooldown-note">
        <span>最近 10 分钟 · 已使用</span>
        <span>
          <Countdown ms={budget.usedMs} /> / 03:00
        </span>
      </div>
      <p className="budget-explanation">
        {budget.blocked ? (
          <>
            剩余额度不足 30 秒。
            <Countdown ms={budget.nextStartAt - now} /> 后可开始至少 30
            秒。额度会随较早的使用时间移出窗口而恢复。
          </>
        ) : (
          <>当前还可使用 {budget.availableSeconds} 秒。每次自动结束，还困时可手动补充。</>
        )}
      </p>
    </div>
  );
}
