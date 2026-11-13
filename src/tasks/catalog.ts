/** Task metadata is independent of React and shared by the engine and UI. */
export const taskCatalog = {
  capture: { name: 'Capture · 快速捕捉', fast: true },
  direction: { name: 'Switch · 方向切换', fast: true },
  search: { name: 'Search · 视觉搜索', fast: true },
  reaction: { name: 'Reaction · 反应速度', fast: false },
  math: { name: 'Math · 快速口算', fast: false },
  stroop: { name: 'Stroop · 颜色判断', fast: false },
  memory: { name: 'Memory · 数字记忆', fast: false },
  typing: { name: 'Typing · 快速输入', fast: false },
} as const;
export type TaskId = keyof typeof taskCatalog;
export const taskIds = Object.keys(taskCatalog) as TaskId[];
