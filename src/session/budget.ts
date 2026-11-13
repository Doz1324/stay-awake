import type { SessionRecord } from './types';

export const WINDOW_MS = 10 * 60_000;
export const LIMIT_MS = 3 * 60_000;
export const MIN_SESSION_SECONDS = 30;
export const SUPPLEMENT_SECONDS = 45;

export function usedInWindow(records: SessionRecord[], now: number) {
  return records.reduce(
    (sum, record) =>
      sum +
      Math.max(0, Math.min(record.endedAt, now) - Math.max(record.startedAt, now - WINDOW_MS)),
    0,
  );
}

/** Credit returns continuously as the *actual used interval* leaves the rolling window. */
export function budgetAt(records: SessionRecord[], now: number) {
  const usedMs = usedInWindow(records, now);
  const availableSeconds = Math.max(0, Math.floor((LIMIT_MS - usedMs + 0.00001) / 1000));
  let nextStartAt = now;
  if (availableSeconds < MIN_SESSION_SECONDS) {
    let low = Math.ceil(now),
      high = Math.ceil(now + WINDOW_MS);
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (LIMIT_MS - usedInWindow(records, middle) >= MIN_SESSION_SECONDS * 1000) high = middle;
      else low = middle + 1;
    }
    nextStartAt = high;
  }
  return { usedMs, availableSeconds, nextStartAt, blocked: availableSeconds < MIN_SESSION_SECONDS };
}
export type Budget = ReturnType<typeof budgetAt>;
