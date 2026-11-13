import { describe, expect, it } from 'vitest';
import { budgetAt, usedInWindow } from '../src/session/budget';
import { begin, finish, initialState, sequenceFor } from '../src/session/model';
import { migrateState, isStoredState } from '../src/storage/validate';
import type { SessionRecord } from '../src/session/types';

const record = (start: number, end: number): SessionRecord => ({
  id: String(start),
  startedAt: start,
  endedAt: end,
  elapsedMs: end - start,
  mode: 'math',
  reason: 'complete',
  metrics: {},
});

describe('rolling ten-minute allowance', () => {
  it('allows 60 + 45 + 45 + 30 seconds, then blocks every mode', () => {
    let state = initialState();
    let now = 1_000_000;
    for (const [index, expected] of [60, 45, 45, 30].entries()) {
      state = begin(state, now, String(index), 'owner', index > 0);
      expect(state.active!.deadline - now).toBe(expected * 1000);
      now = state.active!.deadline;
      state = finish(state, now, 'complete');
    }
    expect(budgetAt(state.records, now)).toMatchObject({ availableSeconds: 0, blocked: true });
    state.settings.mode = 'emergency';
    expect(() => begin(state, now, 'again', 'owner', true)).toThrow();
    expect(() => begin(state, now, 'again', 'owner')).toThrow();
  });
  it('counts partial intersections, not whole sessions or fixed buckets', () => {
    const records = [record(0, 90_000), record(90_000, 180_000)];
    expect(usedInWindow(records, 600_000)).toBe(180_000);
    expect(usedInWindow(records, 615_000)).toBe(165_000);
    expect(budgetAt(records, 180_000).nextStartAt).toBe(630_000);
    expect(budgetAt(records, 629_999).blocked).toBe(true);
    expect(budgetAt(records, 630_000).availableSeconds).toBe(30);
    expect(budgetAt(records, 780_000).availableSeconds).toBe(180);
  });
  it('sparse intervals restore at the earliest genuinely available point', () => {
    const records = [record(0, 60_000), record(120_000, 180_000), record(300_000, 360_000)];
    expect(budgetAt(records, 360_000).nextStartAt).toBe(630_000);
    expect(usedInWindow(records, 690_000)).toBe(120_000);
  });
  it('shortens any mode to remaining allowance and requires at least 30 seconds', () => {
    const state = initialState();
    state.settings.mode = 'emergency';
    state.records = [record(0, 90_000), record(90_000, 140_000)];
    const next = begin(state, 140_000, 'short', 'owner');
    expect(next.active!.deadline).toBe(180_000);
    expect(next.active!.sequence).toHaveLength(3);
    expect(isStoredState(next)).toBe(true);
    state.records.push(record(140_000, 151_000));
    expect(() => begin(state, 151_000, 'blocked', 'owner')).toThrow();
  });
  it('keeps every rolling window under the cap through repeated use and recovery', () => {
    let state = initialState();
    let now = 1_000_000;
    for (let i = 0; i < 60; i++) {
      const budget = budgetAt(state.records, now);
      if (budget.blocked) now = budget.nextStartAt;
      state = begin(state, now, String(i), 'owner', i % 2 === 0);
      const deadline = state.active!.deadline;
      state = finish(state, deadline, 'complete');
      for (let sample = now; sample <= deadline; sample += 1000)
        expect(usedInWindow(state.records, sample)).toBeLessThanOrEqual(180_000);
      now = deadline + (i % 3) * 1000;
    }
  });
  it('supplement changes the previous task even if it had no answers', () => {
    let state = begin(initialState(), 100_000, 'first', 'owner');
    state = finish(state, 101_000, 'exit');
    for (let i = 0; i < 30; i++)
      expect(begin(state, 101_000, String(i), 'owner', true).active!.sequence[0]).not.toBe(
        state.records[0].lastTask,
      );
    expect(sequenceFor('boost', Math.random, 45)).toHaveLength(3);
  });
});
describe('version-one migration', () => {
  it('preserves history and theme but removes the old cooldown', () => {
    const old = {
      ...initialState(),
      version: 1,
      cooldownUntil: 999_999,
      settings: { duration: 60, cooldown: 10, mode: 'random', theme: 'light' },
      records: [record(100_000, 160_000)],
    };
    const next = migrateState(old);
    expect(next.version).toBe(2);
    expect(next.records).toEqual(old.records);
    expect(next.settings).toEqual({ duration: 60, mode: 'boost', theme: 'light' });
    expect(next).not.toHaveProperty('cooldownUntil');
    expect(budgetAt(next.records, 160_000).availableSeconds).toBe(120);
    expect(begin(next, 160_000, 'supplement', 'owner', true).active).not.toBeNull();
  });
  it('retains an active legacy deadline for normal recovery', () => {
    const active = begin(initialState(), 100_000, 'old', 'closed').active!;
    const old = {
      ...initialState(),
      version: 1,
      cooldownUntil: 0,
      settings: { duration: 60, cooldown: 10, mode: 'math', theme: 'dark' },
      active: { ...active, mode: 'math', sequence: ['math'], cooldownMinutes: 10 },
    };
    const migrated = migrateState(old);
    expect(migrated.active!.deadline).toBe(160_000);
    expect(finish(migrated, 200_000, 'interrupted').records[0].elapsedMs).toBe(60_000);
  });
});
