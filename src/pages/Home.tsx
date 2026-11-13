import { Countdown } from '../components/Countdown';
import type { Settings } from '../session/types';
import type { Mode } from '../tasks/types';
import { taskCatalog, taskIds } from '../tasks/catalog';
import type { Budget } from '../session/budget';

export const modeLabels = {
  boost: 'Boost · 快节奏混合（推荐）',
  random: 'Random · 随机唤醒',
  ...Object.fromEntries(taskIds.map((id) => [id, taskCatalog[id].name])),
  emergency: 'Emergency · 90s 混合',
} as Record<Mode, string>;
interface Props {
  settings: Settings;
  update: (settings: Settings) => void;
  start: () => void;
  budget: Budget;
  now: number;
  supplement: () => void;
  activeElsewhere: boolean;
  disabled: boolean;
  todaySessions: number;
}
export function Home({
  settings,
  update,
  start,
  budget,
  now,
  supplement,
  activeElsewhere,
  disabled,
  todaySessions,
}: Props) {
  const requested = settings.mode === 'emergency' ? 90 : settings.duration;
  const duration = budget.blocked ? requested : Math.min(requested, budget.availableSeconds);
  const cooling = budget.blocked;
  return (
    <main className="home">
      <div className="eyebrow">
        <span className="small-line" /> RESET YOUR FOCUS
      </div>
      <h1>
        给注意力
        <br />
        <span>一个短暂重启。</span>
      </h1>
      <p className="intro">不方便走动时，用 30–90 秒短任务，尝试找回状态。</p>
      <section className="launch-panel" aria-label="唤醒设置">
        <div className="panel-heading">
          <span>学习 / 办公 / 阅读</span>
          <span className="muted mono">{String(duration).padStart(2, '0')} SEC</span>
        </div>
        <div className="mode-field">
          <label htmlFor="mode">
            任务模式 <span>MODE</span>
          </label>
          <select
            id="mode"
            value={settings.mode}
            onChange={(e) => update({ ...settings, mode: e.target.value as Mode })}
          >
            {Object.entries(modeLabels).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-grid">
          <fieldset disabled={settings.mode === 'emergency'}>
            <legend>
              唤醒时长 <span>SECONDS</span>
            </legend>
            <div className="segments">
              {([30, 60, 90] as const).map((value) => (
                <button
                  type="button"
                  aria-pressed={requested === value}
                  key={value}
                  onClick={() => update({ ...settings, duration: value })}
                >
                  {value}
                  <span>s</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="budget-box">
            <span>最近 10 分钟剩余</span>
            <strong>
              {budget.availableSeconds}
              <small> / 180 秒</small>
            </strong>
            <small>按实际使用时长累计</small>
          </div>
        </div>
        <button
          className="start-button"
          onClick={start}
          disabled={disabled || cooling || activeElsewhere}
        >
          <span>
            {cooling ? (
              <>
                额度恢复中 <Countdown ms={budget.nextStartAt - now} />
              </>
            ) : activeElsewhere ? (
              '另一个页面正在唤醒'
            ) : (
              <>
                开始唤醒 <span className="start-english">START {duration}s</span>
              </>
            )}
          </span>
          <span aria-hidden="true">↗</span>
        </button>
        <p className="panel-note">
          {cooling ? (
            '剩余额度不足 30 秒，显示的是下一次可开始的等待时间。'
          ) : activeElsewhere ? (
            '请回到已开启的页面。本次计时不会重置。'
          ) : (
            <>
              按 <kbd>Space</kbd> 开始 · 每 10 分钟累计最多 3 分钟
            </>
          )}
        </p>
        {budget.usedMs > 0 && (
          <button
            className="supplement-button"
            disabled={disabled || cooling || activeElsewhere}
            onClick={supplement}
          >
            仍然困 / 又困了 · 补充 {Math.min(45, budget.availableSeconds)} 秒
          </button>
        )}
        {!cooling && duration < requested && (
          <p className="panel-note">按剩余额度，本次将缩短为 {duration} 秒。</p>
        )}
      </section>
      <div className="principles">
        <span>
          01 <b>短时集中</b>
        </span>
        <span className="principle-line" />
        <span>
          02 <b>自动结束</b>
        </span>
        <span className="principle-line" />
        <span>
          03 <b>继续正事</b>
        </span>
      </div>
      <p className="today-note">
        今日已唤醒 {todaySessions} 次 <span>·</span> 不必刷新纪录，只需找回注意力。
      </p>
    </main>
  );
}
