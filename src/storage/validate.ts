import { taskIds } from '../tasks/types';
import type { StoredState } from '../session/types';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;
const oneOf = (value: unknown, values: readonly unknown[]) => values.includes(value);
const modes = [...taskIds, 'random', 'emergency', 'boost'];
function metrics(value: unknown) {
  return (
    object(value) &&
    Object.entries(value).every(
      ([key, metric]) =>
        oneOf(key, taskIds) &&
        object(metric) &&
        ['attempts', 'correct', 'reactionTotal', 'reactionCount', 'characters'].every((key) =>
          number(metric[key]),
        ) &&
        (metric.correct as number) <= (metric.attempts as number),
    )
  );
}
export function isStoredState(value: unknown): value is StoredState {
  if (!object(value) || value.version !== 2 || !object(value.settings)) return false;
  const s = value.settings;
  if (
    !oneOf(s.duration, [30, 60, 90]) ||
    !oneOf(s.mode, modes) ||
    !oneOf(s.theme, ['dark', 'light'])
  )
    return false;
  if (!number(value.lastSessionEndTime) || !Array.isArray(value.records)) return false;
  if (
    !value.records.every(
      (r) =>
        object(r) &&
        (r.feedback === undefined || oneOf(r.feedback, ['clear', 'slight', 'none'])) &&
        (r.lastTask === undefined || oneOf(r.lastTask, taskIds)) &&
        typeof r.id === 'string' &&
        number(r.startedAt) &&
        number(r.endedAt) &&
        r.endedAt >= r.startedAt &&
        number(r.elapsedMs) &&
        r.elapsedMs <= 90_000 &&
        r.elapsedMs === r.endedAt - r.startedAt &&
        oneOf(r.mode, modes) &&
        oneOf(r.reason, ['complete', 'exit', 'interrupted']) &&
        metrics(r.metrics),
    )
  )
    return false;
  const a = value.active;
  if (a === null) return true;
  if (
    !object(a) ||
    typeof a.id !== 'string' ||
    typeof a.owner !== 'string' ||
    !number(a.startedAt) ||
    !number(a.deadline) ||
    !number(a.heartbeatAt) ||
    typeof a.supplement !== 'boolean' ||
    !oneOf(a.mode, modes) ||
    !metrics(a.metrics) ||
    !Array.isArray(a.sequence)
  )
    return false;
  const duration = a.deadline - a.startedAt;
  return (
    duration >= 30_000 &&
    duration <= 90_000 &&
    a.sequence.length ===
      (a.mode === 'emergency'
        ? Math.ceil(duration / 18_000)
        : a.mode === 'boost'
          ? Math.ceil(duration / 15_000)
          : 1) &&
    a.sequence.every((id) => oneOf(id, taskIds))
  );
}

/** Keep the browser key so existing history survives. Never silently reset invalid data. */
export function migrateState(value: unknown): StoredState {
  if (isStoredState(value)) return value;
  if (
    !object(value) ||
    value.version !== 1 ||
    !object(value.settings) ||
    !number(value.cooldownUntil)
  )
    throw new Error('invalid');
  const { cooldown: _cooldown, ...settings } = value.settings;
  if (!oneOf(_cooldown, [5, 10, 15, 20])) throw new Error('invalid');
  const { cooldownUntil: _until, ...rest } = value;
  let active = value.active;
  if (object(active)) {
    const { cooldownMinutes: _minutes, ...session } = active;
    if (!oneOf(_minutes, [5, 10, 15, 20])) throw new Error('invalid');
    active = { ...session, supplement: false };
  }
  const migrated = {
    ...rest,
    version: 2,
    settings: { ...settings, mode: settings.mode === 'random' ? 'boost' : settings.mode },
    active,
  };
  if (!isStoredState(migrated)) throw new Error('invalid');
  return migrated;
}
