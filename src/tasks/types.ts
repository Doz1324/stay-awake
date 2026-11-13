import type { TaskId } from './catalog';
export { taskIds, type TaskId } from './catalog';
export type Mode = TaskId | 'random' | 'emergency' | 'boost';
export interface TaskEvent {
  correct: boolean;
  reactionMs?: number;
  characters?: number;
}
export interface TaskProps {
  /** Gate every interaction against the global deadline, including segment changes. */
  canInteract: () => boolean;
  report: (event: TaskEvent) => void;
}
export interface TaskMetrics {
  attempts: number;
  correct: number;
  reactionTotal: number;
  reactionCount: number;
  characters: number;
}
export type Metrics = Partial<Record<TaskId, TaskMetrics>>;
