import { BudgetStatus } from '../components/BudgetStatus';
import { feedbackOptions } from '../statistics/feedback';
import type { Budget } from '../session/budget';
import { taskRegistry } from '../tasks/registry';
import { metricText } from '../statistics/statistics';
import type { SessionRecord } from '../session/types';
import type { TaskId } from '../tasks/types';

export function Result({
  record,
  budget,
  now,
  disabled,
  supplement,
  returnHome,
  saveFeedback,
}: {
  record: SessionRecord;
  budget: Budget;
  now: number;
  disabled: boolean;
  supplement: () => void;
  returnHome: () => void;
  saveFeedback: (feedback: NonNullable<SessionRecord['feedback']>) => void;
}) {
  return (
    <main className="content-page result-page">
      <div className="result-mark" aria-hidden="true">
        ✓
      </div>
      <div className="eyebrow">
        {record.reason === 'complete' ? 'SESSION COMPLETE' : 'SESSION ENDED'}
      </div>
      <h1 className="result-message">本次结束。回到你要做的事。</h1>
      <p className="intro">Session complete. Back to what matters.</p>
      <section className="section-card" aria-label="本次表现">
        <div className="metric-row">
          <span className="muted">本次专注</span>
          <span className="mono">{Math.round(record.elapsedMs / 1000)} 秒</span>
        </div>
        {Object.entries(record.metrics).length ? (
          Object.entries(record.metrics).map(([key, value]) => (
            <div className="metric-row" key={key}>
              <span className="muted">{taskRegistry[key as TaskId].name}</span>
              <span className="mono">{metricText(key as TaskId, value)}</span>
            </div>
          ))
        ) : (
          <p className="help">本次暂无作答数据。</p>
        )}
      </section>
      <section className="section-card" aria-label="效果反馈">
        <h2>现在感觉怎么样？</h2>
        <div className="feedback-options">
          {feedbackOptions.map(({ value, label }) => (
            <button
              key={value}
              aria-pressed={record.feedback === value}
              disabled={disabled}
              onClick={() => saveFeedback(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="help" role="status">
          {record.feedback
            ? '已保存，可修改。仅记录本次主观感受。'
            : '可选，点一下即可。仅保存在当前浏览器，不会上传。'}
        </p>
      </section>
      <BudgetStatus budget={budget} now={now} />
      <button className="start-button return-button" onClick={returnHome}>
        <span>
          返回首页 <span className="start-english">RETURN</span>
        </span>
        <span aria-hidden="true">↗</span>
      </button>
      <button
        className="supplement-button"
        disabled={disabled || budget.blocked}
        onClick={supplement}
      >
        {budget.blocked
          ? '补充暂不可用 · 等待额度恢复'
          : `仍然困 · 换一组任务补充 ${Math.min(45, budget.availableSeconds)} 秒`}
      </button>
    </main>
  );
}
