import { begin, finish, recordEvent, segmentAt } from './model';
import { initialState, type SessionRecord, type Settings, type StoredState } from './types';
import { exclusive, readState, STORAGE_KEY, writeState } from '../storage/storage';
import type { TaskEvent, TaskId } from '../tasks/types';
import { budgetAt } from './budget';

export interface Snapshot {
  state: StoredState;
  now: number;
  ready: boolean;
  error: string;
  result: SessionRecord | null;
}
const ownerKey = 'stay-awake-document';
const lockName = (owner: string) => `stay-awake-owner:${owner}`;

export class SessionManager {
  readonly owner = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  private snapshot: Snapshot = {
    state: initialState(),
    now: Date.now(),
    ready: false,
    error: '',
    result: null,
  };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setInterval>;
  private releaseOwner?: () => void;
  private previousOwner: string | null = null;
  private lastCheck = 0;
  private checking = false;
  private disposed = false;
  private ending = false;
  private clockAnchor = { wall: Date.now(), mono: performance.now() };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.snapshot;
  private publish(patch: Partial<Snapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  now = () =>
    Math.max(Date.now(), this.clockAnchor.wall + performance.now() - this.clockAnchor.mono);
  private fail(error: unknown) {
    this.publish({
      error: error instanceof Error ? error.message : '本地存储不可用，请刷新后重试。',
      ready: false,
    });
  }
  private accept(state: StoredState) {
    const wasOwned = this.snapshot.state.active?.owner === this.owner;
    const result =
      wasOwned && !state.active ? (state.records.at(-1) ?? null) : this.snapshot.result;
    this.publish({ state, result, now: this.now() });
  }
  async initialize() {
    this.disposed = false;
    try {
      this.previousOwner = sessionStorage.getItem(ownerKey);
      sessionStorage.setItem(ownerKey, this.owner);
      if (navigator.locks) {
        await new Promise<void>((resolve, reject) => {
          void navigator.locks
            .request(
              lockName(this.owner),
              () =>
                new Promise<void>((release) => {
                  this.releaseOwner = release;
                  resolve();
                }),
            )
            .catch(reject);
        });
      }
      await this.reconcile(true);
      this.publish({ ready: true });
      window.addEventListener('storage', this.onStorage);
      window.addEventListener('pagehide', this.onPageHide);
      window.addEventListener('pageshow', this.onPageShow);
      document.addEventListener('visibilitychange', this.onVisibility);
      this.timer = setInterval(this.tick, 100);
    } catch (error) {
      this.fail(error);
    }
  }
  private reconcile = async (initial = false) => {
    if (this.checking || this.disposed) return;
    this.checking = true;
    try {
      const observedId = readState().active?.id;
      const locks = navigator.locks ? await navigator.locks.query() : null;
      await exclusive(() => {
        let state = readState();
        const active = state.active;
        if (active) {
          const alive = locks?.held?.some((lock) => lock.name === lockName(active.owner));
          // Without Web Locks, conservatively preserve another tab until its deadline.
          const abandoned =
            active.id === observedId &&
            (locks ? !alive : initial && active.owner === this.previousOwner);
          if (this.now() >= active.deadline || abandoned) {
            state = finish(state, this.now(), 'interrupted');
          }
        }
        if (initial || state.active?.owner === this.owner || state.active !== active) {
          if (state.active?.owner === this.owner)
            state = { ...state, active: { ...state.active, heartbeatAt: this.now() } };
          writeState(state);
        }
        this.accept(state);
      });
    } finally {
      this.checking = false;
    }
  };
  private tick = () => {
    if (this.disposed) return;
    const now = this.now();
    this.publish({ now });
    if (
      this.snapshot.state.active?.owner === this.owner &&
      now >= this.snapshot.state.active.deadline
    )
      void this.end('complete');
    if (now - this.lastCheck >= 1000) {
      this.lastCheck = now;
      void this.reconcile().catch((error) => this.fail(error));
    }
  };
  private onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null)
      void this.reconcile().catch((error) => this.fail(error));
  };
  private onVisibility = () => this.tick();
  private onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) window.location.reload();
  };
  private onPageHide = () => {
    try {
      const state = readState();
      if (state.active?.owner === this.owner) writeState(finish(state, this.now(), 'interrupted'));
    } catch {
      /* The already persisted active deadline remains the recovery guard. */
    }
    this.releaseOwner?.();
  };
  async start(supplement = false) {
    if (!this.snapshot.ready || this.snapshot.error) return;
    try {
      await exclusive(() => {
        const state = readState();
        if (state.active || budgetAt(state.records, this.now()).blocked) {
          this.accept(state);
          return;
        }
        const next = begin(
          state,
          this.now(),
          globalThis.crypto?.randomUUID?.() ?? `${this.owner}-${this.now()}`,
          this.owner,
          supplement,
        );
        writeState(next);
        this.publish({ state: next, result: null, now: this.now() });
      });
    } catch (error) {
      this.fail(error);
    }
  }
  async end(reason: SessionRecord['reason'] = 'exit') {
    if (this.ending) return;
    this.ending = true;
    try {
      await exclusive(() => {
        const state = readState();
        if (state.active?.owner !== this.owner) {
          this.accept(state);
          return;
        }
        const next = finish(state, this.now(), reason);
        writeState(next);
        this.accept(next);
      });
    } catch (error) {
      this.fail(error);
    } finally {
      this.ending = false;
    }
  }
  canInteract = (index: number) => {
    const active = this.snapshot.state.active;
    if (this.snapshot.error || !active || active.owner !== this.owner || this.ending) return false;
    if (this.now() >= active.deadline) {
      void this.end('complete');
      return false;
    }
    return segmentAt(active, this.now()) === index;
  };
  async report(task: TaskId, index: number, event: TaskEvent) {
    if (!this.canInteract(index)) return;
    try {
      await exclusive(() => {
        const state = readState();
        const active = state.active;
        if (!active || active.owner !== this.owner) {
          this.accept(state);
          return;
        }
        if (this.now() >= active.deadline) {
          const next = finish(state, this.now(), 'complete');
          writeState(next);
          this.accept(next);
          return;
        }
        if (segmentAt(active, this.now()) !== index || active.sequence[index] !== task) return;
        const next = recordEvent(state, task, event);
        writeState(next);
        this.accept(next);
      });
    } catch (error) {
      this.fail(error);
    }
  }
  async update(settings: Settings) {
    try {
      await exclusive(() => {
        const next = { ...readState(), settings };
        writeState(next);
        this.accept(next);
      });
    } catch (error) {
      this.fail(error);
    }
  }
  async saveFeedback(id: string, feedback: NonNullable<SessionRecord['feedback']>) {
    try {
      await exclusive(() => {
        const state = readState();
        const records = state.records.map((record) =>
          record.id === id ? { ...record, feedback } : record,
        );
        const next = { ...state, records };
        writeState(next);
        this.accept(next);
        if (this.snapshot.result?.id === id)
          this.publish({ result: records.find((record) => record.id === id) ?? null });
      });
    } catch (error) {
      this.fail(error);
    }
  }
  returnHome = () => this.publish({ result: null });
  dispose() {
    this.onPageHide();
    this.disposed = true;
    clearInterval(this.timer);
    window.removeEventListener('storage', this.onStorage);
    window.removeEventListener('pagehide', this.onPageHide);
    window.removeEventListener('pageshow', this.onPageShow);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.listeners.clear();
  }
}
