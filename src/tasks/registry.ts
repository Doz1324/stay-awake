import type { ComponentType } from 'react';
import type { TaskId, TaskProps } from './types';
import { ReactionTask } from './ReactionTask';
import { MathTask } from './MathTask';
import { StroopTask } from './StroopTask';
import { MemoryTask } from './MemoryTask';
import { TypingTask } from './TypingTask';
import { taskCatalog, taskIds } from './catalog';
import { CaptureTask } from './CaptureTask';
import { DirectionTask } from './DirectionTask';
import { SearchTask } from './SearchTask';

const components: Record<TaskId, ComponentType<TaskProps>> = {
  capture: CaptureTask,
  direction: DirectionTask,
  search: SearchTask,
  reaction: ReactionTask,
  math: MathTask,
  stroop: StroopTask,
  memory: MemoryTask,
  typing: TypingTask,
};
export const taskRegistry = Object.fromEntries(
  taskIds.map((id) => [id, { ...taskCatalog[id], component: components[id] }]),
) as Record<TaskId, { name: string; component: ComponentType<TaskProps>; fast: boolean }>;
