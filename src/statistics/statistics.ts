import type { SessionRecord } from '../session/types';
import type { Metrics, TaskId, TaskMetrics } from '../tasks/types';

export function localDayStart(now: number) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
export function summarize(records: SessionRecord[], now: number) {
  const start = localDayStart(now);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - 6);
  const today = records.filter((item) => item.startedAt >= start && item.startedAt <= now);
  const week = records.filter(
    (item) => item.startedAt >= weekStart.getTime() && item.startedAt <= now,
  );
  const metrics: Metrics = {};
  for (const record of records)
    for (const [key, value] of Object.entries(record.metrics)) {
      const id = key as TaskId;
      const previous = metrics[id] ?? {
        attempts: 0,
        correct: 0,
        reactionCount: 0,
        reactionTotal: 0,
        characters: 0,
      };
      metrics[id] = {
        attempts: previous.attempts + value.attempts,
        correct: previous.correct + value.correct,
        reactionTotal: previous.reactionTotal + value.reactionTotal,
        reactionCount: previous.reactionCount + value.reactionCount,
        characters: previous.characters + value.characters,
      };
    }
  return {
    todayCount: today.length,
    todayMs: today.reduce((sum, item) => sum + item.elapsedMs, 0),
    weekCount: week.length,
    metrics,
  };
}
export function metricText(id: TaskId, value?: TaskMetrics) {
  if (!value?.attempts) return '暂无数据';
  if (id === 'reaction')
    return value.reactionCount
      ? `平均 ${Math.round(value.reactionTotal / value.reactionCount)} ms`
      : '暂无有效反应';
  return `${value.correct} / ${value.attempts} · ${Math.round((value.correct / value.attempts) * 100)}%`;
}
