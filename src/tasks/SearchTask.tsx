import type { TaskProps } from './types';
import { useRapidTask } from './useRapidTask';
import { useTaskKey } from './useTaskTools';
import { searchPrompt } from './rapidGenerators';
import { Feedback } from '../components/Feedback';
import { RoundProgress } from '../components/RoundProgress';

export function SearchTask(props: TaskProps) {
  const game = useRapidTask(searchPrompt, props, { initial: 2400, minimum: 950, maximum: 3500 });
  useTaskKey((event) => {
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      game.answer(Number(event.key) - 1 === game.round.target);
    }
  });
  return (
    <div className="task">
      <h2>找到唯一不同的符号。按格子数字，或直接点击。</h2>
      <RoundProgress remaining={game.remaining} />
      <div className="rapid-grid" aria-label="视觉搜索区域">
        {Array.from({ length: 9 }, (_, index) => (
          <button
            className="search-cell"
            key={index}
            disabled={game.locked}
            aria-label={`格子 ${index + 1}：${index === game.round.target ? game.round.odd : game.round.base}`}
            onClick={() => game.answer(index === game.round.target)}
          >
            <span className="cell-key">{index + 1}</span>
            <span className="search-symbol">
              {index === game.round.target ? game.round.odd : game.round.base}
            </span>
          </button>
        ))}
      </div>
      <Feedback value={game.feedback} />
    </div>
  );
}
