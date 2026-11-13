import type { TaskProps } from './types';
import { useRapidTask } from './useRapidTask';
import { useTaskKey } from './useTaskTools';
import { directionPrompt, directions } from './rapidGenerators';
import { Feedback } from '../components/Feedback';
import { RoundProgress } from '../components/RoundProgress';

export function DirectionTask(props: TaskProps) {
  const game = useRapidTask(directionPrompt, props, { initial: 2200, minimum: 850, maximum: 3200 });
  const prompt = game.round;
  useTaskKey((event) => {
    const index = directions.findIndex((direction) => direction.key === event.key);
    if (index >= 0) {
      event.preventDefault();
      game.answer(index === prompt.correct);
    }
  });
  return (
    <div className="task">
      <h2>按方向键或按钮回答。每四题切换一次规则。</h2>
      <div className={`rule-label ${prompt.rule}`} role="status">
        {prompt.rule === 'pointing' ? '看箭头朝向' : '看箭头所在位置'}
      </div>
      <RoundProgress remaining={game.remaining} />
      <div className="direction-field" aria-label="方向题目">
        <span className="field-center" aria-hidden="true">
          +
        </span>
        <span
          className="direction-arrow"
          style={{
            gridRow: directions[prompt.location].row,
            gridColumn: directions[prompt.location].column,
          }}
        >
          {directions[prompt.pointing].glyph}
        </span>
      </div>
      <div className="direction-options">
        {directions.map((direction, index) => (
          <button
            key={direction.key}
            disabled={game.locked}
            aria-label={direction.label}
            onClick={() => game.answer(index === prompt.correct)}
          >
            {direction.glyph}
            <small>{direction.label}</small>
          </button>
        ))}
      </div>
      <Feedback value={game.feedback} />
    </div>
  );
}
