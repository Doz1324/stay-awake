import { describe, expect, it } from 'vitest';
import {
  begin,
  finish,
  initialState,
  recordEvent,
  segmentAt,
  sequenceFor,
} from '../src/session/model';
import { readState, writeState } from '../src/storage/storage';
import { isStoredState } from '../src/storage/validate';
import { mathQuestion } from '../src/tasks/generators';
import { metricText, summarize } from '../src/statistics/statistics';
import { budgetAt } from '../src/session/budget';

describe('strict session lifecycle', () => {
  it.each([30, 60, 90] as const)(
    'caps %i second sessions at the original deadline after sleep',
    (duration) => {
      const state = initialState();
      state.settings.duration = duration;
      const running = begin(state, 100_000, 'test', 'owner');
      const ended = finish(running, 900_000, 'interrupted');
      expect(ended.lastSessionEndTime).toBe(100_000 + duration * 1000);
      expect(ended.records[0].elapsedMs).toBe(duration * 1000);
      expect(ended.records[0].reason).toBe('complete');
      expect(budgetAt(ended.records, ended.lastSessionEndTime).availableSeconds).toBe(
        180 - duration,
      );
    },
  );
  it('counts exit and refresh as actual use and permits a supplement', () => {
    const running = begin(initialState(), 100_000, 'test', 'owner');
    const ended = finish(running, 104_000, 'interrupted');
    expect(ended.active).toBeNull();
    expect(ended.records[0].elapsedMs).toBe(4000);
    const next = begin(ended, 104_000, 'new', 'owner', true);
    expect(next.active!.deadline).toBe(149_000);
    expect(budgetAt(ended.records, 104_000).availableSeconds).toBe(176);
  });
  it('changing settings does not erase use and finishing is idempotent', () => {
    const running = begin(initialState(), 100_000, 'test', 'owner');
    running.settings.duration = 30;
    const ended = finish(running, 110_000, 'exit');
    expect(budgetAt(ended.records, 110_000).usedMs).toBe(10_000);
    expect(finish(ended, 120_000, 'exit').records).toHaveLength(1);
  });
  it('rejects parallel starts while active', () => {
    const running = begin(initialState(), 100_000, 'test', 'owner');
    expect(() => begin(running, 100_000, 'other', 'other')).toThrow();
  });
  it('ignores invalid reaction values and preserves accuracy', () => {
    let state = begin(initialState(), 100_000, 'test', 'owner');
    state = recordEvent(state, 'reaction', { correct: false });
    state = recordEvent(state, 'reaction', { correct: true, reactionMs: 240 });
    state = recordEvent(state, 'reaction', { correct: true, reactionMs: NaN });
    expect(state.active!.metrics.reaction).toMatchObject({
      attempts: 3,
      correct: 2,
      reactionCount: 1,
      reactionTotal: 240,
    });
  });
});
describe('emergency sequence', () => {
  it('contains five fast slots; first three unique, no adjacent repeats', () => {
    for (let i = 0; i < 100; i++) {
      const sequence = sequenceFor('emergency');
      expect(sequence).toHaveLength(5);
      expect(new Set(sequence.slice(0, 3)).size).toBe(3);
      expect(sequence).not.toContain('memory');
      expect(sequence[4]).not.toBe(sequence[3]);
      expect(sequence.every((id, index) => index === 0 || id !== sequence[index - 1])).toBe(true);
    }
  });
  it('uses one fixed 90-second deadline, including all switches', () => {
    const state = initialState();
    state.settings.mode = 'emergency';
    state.settings.duration = 30;
    const session = begin(state, 100_000, 'test', 'owner').active!;
    expect(session.deadline).toBe(190_000);
    expect(segmentAt(session, 117_999)).toBe(0);
    expect(segmentAt(session, 118_000)).toBe(1);
    expect(segmentAt(session, 190_000)).toBe(4);
  });
});
describe('storage safety', () => {
  it('round trips active sessions and completed records', () => {
    let raw = '';
    const storage = {
      getItem: () => raw,
      setItem: (_: string, value: string) => {
        raw = value;
      },
    };
    const state = begin(initialState(), 100_000, 'test', 'owner');
    writeState(state, storage);
    expect(readState(storage)).toEqual(state);
    writeState(finish(state, 120_000, 'exit'), storage);
    expect(readState(storage).active).toBeNull();
  });
  it('does not silently reset corrupt or future-version storage', () => {
    expect(() => readState({ getItem: () => '{broken' })).toThrow();
    expect(() =>
      readState({ getItem: () => JSON.stringify({ ...initialState(), version: 3 }) }),
    ).toThrow();
  });
  it('fails closed when reads or writes are denied', () => {
    expect(() =>
      readState({
        getItem: () => {
          throw new Error('denied');
        },
      }),
    ).toThrow();
    expect(() =>
      writeState(initialState(), {
        setItem: () => {
          throw new Error('quota');
        },
      }),
    ).toThrow();
  });
  it('rejects sessions outside the maximum duration', () => {
    const state = begin(initialState(), 100_000, 'test', 'owner');
    state.active!.deadline += 100_000;
    expect(isStoredState(state)).toBe(false);
  });
});
describe('task generation and statistics', () => {
  it('generates finite integer answers for all four operations', () => {
    const operations = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const question = mathQuestion();
      expect(Number.isInteger(question.answer)).toBe(true);
      const [left, op, right] = question.prompt.split(' ');
      operations.add(op);
      const a = Number(left),
        b = Number(right);
      const expected = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
      expect(question.answer).toBe(expected);
    }
    expect(operations.size).toBe(4);
  });
  it('groups by local calendar day and includes interrupted use', () => {
    const now = new Date(2026, 8, 21, 12).getTime();
    const old = new Date(2026, 8, 20, 23, 59).getTime();
    let state = finish(begin(initialState(), old, 'yesterday', 'owner'), old + 1000, 'exit');
    state = finish(begin(state, now - 2000, 'today', 'owner'), now, 'exit');
    expect(summarize(state.records, now)).toMatchObject({
      todayCount: 1,
      todayMs: 2000,
      weekCount: 2,
    });
    expect(metricText('math')).toBe('暂无数据');
  });
});
