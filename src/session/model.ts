import {
  initialState,
  type ActiveSession,
  type SessionRecord,
  type Settings,
  type StoredState,
} from './types';
import { taskIds, type TaskEvent, type TaskId } from '../tasks/types';
import { taskCatalog } from '../tasks/catalog';
import { budgetAt, SUPPLEMENT_SECONDS } from './budget';

export function sequenceFor(
  mode: Settings['mode'],
  random = Math.random,
  duration = 90,
  avoid?: TaskId,
): TaskId[] {
  if (mode === 'random') return [taskIds[Math.floor(random() * taskIds.length)]];
  if (mode !== 'emergency' && mode !== 'boost') return [mode];
  const sequence: TaskId[] = taskIds.filter((id) => taskCatalog[id].fast);
  for (let i = sequence.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [sequence[i], sequence[j]] = [sequence[j], sequence[i]];
  }
  if (sequence[0] === avoid && sequence.length > 1)
    [sequence[0], sequence[1]] = [sequence[1], sequence[0]];
  const count = Math.ceil(duration / (mode === 'emergency' ? 18 : 15));
  const slots: TaskId[] = sequence.slice(0, count);
  while (slots.length < count) {
    const remaining = sequence.filter((id) => id !== slots.at(-1));
    slots.push(remaining[Math.floor(random() * remaining.length)] ?? sequence[0]);
  }
  return slots;
}
export function begin(
  state: StoredState,
  now: number,
  id: string,
  owner: string,
  supplement = false,
): StoredState {
  const budget = budgetAt(state.records, now);
  if (state.active || budget.blocked) throw new Error('当前正在唤醒或剩余额度不足 30 秒。');
  const { settings } = state;
  const duration = Math.min(
    supplement ? SUPPLEMENT_SECONDS : settings.mode === 'emergency' ? 90 : settings.duration,
    budget.availableSeconds,
  );
  const mode = supplement ? 'boost' : settings.mode;
  const lastTasks = Object.keys(state.records.at(-1)?.metrics ?? {}) as TaskId[];
  return {
    ...state,
    active: {
      id,
      owner,
      startedAt: now,
      deadline: now + duration * 1000,
      supplement,
      mode,
      sequence: sequenceFor(
        mode,
        Math.random,
        duration,
        state.records.at(-1)?.lastTask ?? lastTasks.at(-1),
      ),
      heartbeatAt: now,
      metrics: {},
    },
  };
}
export function segmentAt(session: ActiveSession, now: number) {
  return Math.min(
    session.sequence.length - 1,
    Math.max(
      0,
      Math.floor((now - session.startedAt) / (session.mode === 'emergency' ? 18_000 : 15_000)),
    ),
  );
}
export function finish(
  state: StoredState,
  now: number,
  reason: SessionRecord['reason'],
): StoredState {
  const active = state.active;
  if (!active) return state;
  const endedAt = Math.max(active.startedAt, Math.min(now, active.deadline));
  const record: SessionRecord = {
    lastTask: active.sequence[segmentAt(active, Math.max(active.startedAt, endedAt - 1))],
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    elapsedMs: endedAt - active.startedAt,
    mode: active.mode,
    reason: endedAt >= active.deadline ? 'complete' : reason,
    metrics: active.metrics,
  };
  return {
    ...state,
    active: null,
    lastSessionEndTime: endedAt,
    records: [...state.records.filter((item) => item.id !== active.id), record],
  };
}
export function recordEvent(state: StoredState, task: TaskId, event: TaskEvent): StoredState {
  if (!state.active) return state;
  const old = state.active.metrics[task] ?? {
    attempts: 0,
    correct: 0,
    reactionCount: 0,
    reactionTotal: 0,
    characters: 0,
  };
  const validReaction =
    event.correct &&
    event.reactionMs !== undefined &&
    Number.isFinite(event.reactionMs) &&
    event.reactionMs >= 0;
  const metrics = {
    ...state.active.metrics,
    [task]: {
      attempts: old.attempts + 1,
      correct: old.correct + Number(event.correct),
      reactionTotal: old.reactionTotal + (validReaction ? event.reactionMs! : 0),
      reactionCount: old.reactionCount + Number(validReaction),
      characters: old.characters + Math.max(0, event.characters ?? 0),
    },
  };
  return { ...state, active: { ...state.active, metrics } };
}
export { initialState };
