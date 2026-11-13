import { Countdown } from '../components/Countdown';
import { segmentAt } from '../session/model';
import { taskRegistry } from '../tasks/registry';
import type { ActiveSession } from '../session/types';
import type { SessionManager } from '../session/SessionManager';

export function Session({
  active,
  now,
  manager,
}: {
  active: ActiveSession;
  now: number;
  manager: SessionManager;
}) {
  const index = segmentAt(active, now);
  const task = active.sequence[index];
  const definition = taskRegistry[task];
  const Task = definition.component;
  const remaining = Math.max(0, active.deadline - now);
  return (
    <main className="session-page">
      <div className="session-top">
        <div>
          <h1>Wake-up session</h1>
          <p>
            {definition.name}
            {active.sequence.length > 1
              ? ` · 混合任务 ${index + 1} / ${active.sequence.length}`
              : ''}
            {active.supplement ? ' · 补充唤醒' : ''}
          </p>
        </div>
        <div className="session-clock">
          <Countdown ms={remaining} />
        </div>
      </div>
      <div className="time-track" aria-hidden="true">
        <div style={{ width: `${(remaining / (active.deadline - active.startedAt)) * 100}%` }} />
      </div>
      <div className="task-area">
        {remaining > 0 ? (
          <Task
            key={`${active.id}:${index}`}
            canInteract={() => manager.canInteract(index)}
            report={(event) => {
              void manager.report(task, index, event);
            }}
          />
        ) : (
          <p>本次结束。回到你要做的事。</p>
        )}
      </div>
      <div className="session-bottom">
        <p>
          到点自动结束。
          <br />
          中途退出按实际使用时间计入额度。
        </p>
        <button className="quiet-button" onClick={() => void manager.end()}>
          结束本次 <kbd>Esc</kbd>
        </button>
      </div>
    </main>
  );
}
