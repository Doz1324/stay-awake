import type { SessionManager } from './SessionManager';
import { budgetAt } from './budget';

/** Optional browser-native, read-only integration. No task answers or bypass actions. */
export function registerStatusTool(manager: SessionManager) {
  const context = (
    document as Document & {
      modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => unknown };
    }
  ).modelContext;
  if (!context) return;
  const controller = new AbortController();
  try {
    void Promise.resolve(
      context.registerTool(
        {
          name: 'read_wake_up_status',
          title: '查看唤醒状态',
          description:
            'Read whether Stay Awake is ready, running, or waiting for rolling usage credit. Does not start or extend a session.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          execute(input: unknown) {
            if (
              !input ||
              typeof input !== 'object' ||
              Array.isArray(input) ||
              Object.keys(input).length
            )
              throw new Error('Expected an empty object.');
            const { state, error, ready } = manager.getSnapshot();
            const now = manager.now();
            const budget = budgetAt(state.records, now);
            return {
              status:
                error || !ready
                  ? 'unavailable'
                  : state.active
                    ? 'running'
                    : budget.blocked
                      ? 'budget_exhausted'
                      : 'ready',
              remainingSeconds: Math.ceil(
                Math.max(0, (state.active?.deadline ?? budget.nextStartAt) - now) / 1000,
              ),
              availableSeconds: budget.availableSeconds,
            };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {
      /* Optional API, no effect on the app. */
    });
  } catch {
    /* Unsupported implementations must not interfere with the session. */
  }
  return () => controller.abort();
}
