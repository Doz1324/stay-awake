import type { Settings as Preferences, SessionRecord } from '../session/types';
import { summarize, metricText } from '../statistics/statistics';
import { taskRegistry } from '../tasks/registry';
import { taskIds } from '../tasks/types';
import { feedbackOptions } from '../statistics/feedback';

export function Settings({
  settings,
  records,
  now,
  update,
  back,
  offline,
}: {
  settings: Preferences;
  records: SessionRecord[];
  now: number;
  update: (value: Preferences) => void;
  back: () => void;
  offline: string;
}) {
  const stats = summarize(records, now);
  return (
    <main className="content-page">
      <button className="quiet-button" onClick={back}>
        ← 返回
      </button>
      <h1>保持简单，保持专注。</h1>
      <p className="intro">短暂集中之后，继续你要做的事。</p>
      <section className="section-card">
        <fieldset>
          <legend>外观</legend>
          <div className="segments">
            {(['dark', 'light'] as const).map((theme) => (
              <button
                key={theme}
                aria-pressed={settings.theme === theme}
                onClick={() => update({ ...settings, theme })}
              >
                {theme === 'dark' ? '深色' : '浅色'}
              </button>
            ))}
          </div>
        </fieldset>
        <p className="help">
          单次时长可在首页调整。所有模式共享滚动 10 分钟 / 180 秒额度；还困时可补充一次，默认 45
          秒。开始至少需要 30 秒额度，剩余不足所选时长时会自动缩短。
        </p>
      </section>
      <h2>今天</h2>
      <section className="section-card stat-grid">
        <div>
          <span className="muted">使用次数</span>
          <strong>
            {stats.todayCount}
            <small> 次</small>
          </strong>
        </div>
        <div>
          <span className="muted">累计专注</span>
          <strong>
            {(stats.todayMs / 60_000).toFixed(1)}
            <small> 分钟</small>
          </strong>
        </div>
      </section>
      <p className="help">
        最近 7 天（含今天）共 {stats.weekCount} 次。提前结束也计入实际使用时间。
      </p>
      <h2>效果反馈</h2>
      <section className="section-card">
        {feedbackOptions.map(({ value, label }) => (
          <div className="metric-row" key={value}>
            <span className="muted">{label}</span>
            <span>{records.filter((record) => record.feedback === value).length} 次</span>
          </div>
        ))}
        <p className="help">累计主观反馈；未反馈的使用不计入。仅保存在自己的浏览器中。</p>
      </section>
      <h2>任务表现</h2>
      <section className="section-card">
        {taskIds.map((id) => (
          <div className="metric-row" key={id}>
            <span className="muted">{taskRegistry[id].name}</span>
            <span>{metricText(id, stats.metrics[id])}</span>
          </div>
        ))}
      </section>
      <p className="help">
        累计表现仅供回顾。Typing 按输入字符统计正确率，修正不会抹去原来的错误。
      </p>
      <h2>本地与离线</h2>
      <section className="section-card">
        <p>{offline}</p>
        <p className="help">
          所有题目与词库都在本地。不需要账号，没有数据上传。记录仅保存在当前浏览器和当前网站地址中；清除网站数据会删除记录。
        </p>
        <p className="help">
          更换网址不会迁移记录。旧网址的使用记录与反馈仍保留在原来的浏览器中，新网址单独保存。
        </p>
        <p className="help">
          此工具无法阻止主动清除数据、修改系统时间或换浏览器。设备之间的使用额度不会同步。快节奏任务的实际防困效果仍需通过使用反馈验证。
        </p>
      </section>
    </main>
  );
}
