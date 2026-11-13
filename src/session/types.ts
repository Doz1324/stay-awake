import type { Metrics, Mode, TaskId } from '../tasks/types';

export interface Settings {
  duration: 30 | 60 | 90;
  mode: Mode;
  theme: 'dark' | 'light';
}
export interface ActiveSession {
  id: string;
  owner: string;
  startedAt: number;
  deadline: number;
  supplement: boolean;
  mode: Mode;
  sequence: TaskId[];
  heartbeatAt: number;
  metrics: Metrics;
}
export interface SessionRecord {
  feedback?: 'clear' | 'slight' | 'none';
  lastTask?: TaskId;
  id: string;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  mode: Mode;
  reason: 'complete' | 'exit' | 'interrupted';
  metrics: Metrics;
}
export interface StoredState {
  version: 2;
  settings: Settings;
  active: ActiveSession | null;
  lastSessionEndTime: number;
  records: SessionRecord[];
}
export const defaultSettings: Settings = {
  duration: 60,
  mode: 'boost',
  theme: 'dark',
};
export const initialState = (): StoredState => ({
  version: 2,
  settings: { ...defaultSettings },
  active: null,
  lastSessionEndTime: 0,
  records: [],
});
