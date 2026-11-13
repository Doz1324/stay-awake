import { useRef } from 'react';
import type { TaskProps } from './types';
import { useRapidTask } from './useRapidTask';
import { useTaskKey } from './useTaskTools';
import { randomInt } from './generators';
import { Feedback } from '../components/Feedback';
import { RoundProgress } from '../components/RoundProgress';

export function CaptureTask(props: TaskProps) {
  const previous = useRef(-1);
  const game = useRapidTask(
    () => {
      const next =
        previous.current < 0 ? randomInt(0, 8) : (previous.current + randomInt(1, 8)) % 9;
      previous.current = next;
      return next;
    },
    props,
    { initial: 1800, minimum: 500, maximum: 2500 },
  );
  useTaskKey((event) => {
    if (/^[1-9]$/.test(event.key)) {
      event.preventDefault();
      game.answer(Number(event.key) - 1 === game.round);
    }
  });
  return (
    <div className="task">
      <h2>捕捉亮起的目标。按格子数字，或直接点击。</h2>
      <RoundProgress remaining={game.remaining} />
      <div className="rapid-grid" aria-label="目标区域">
        {Array.from({ length: 9 }, (_, index) => (
          <button
            key={index}
            className={`capture-cell ${game.round === index ? 'target' : ''}`}
            aria-label={`格子 ${index + 1}${game.round === index ? '，目标' : ''}`}
            disabled={game.locked}
            onClick={() => game.answer(index === game.round)}
          >
            <span className="cell-key">{index + 1}</span>
            {game.round === index && <span className="target-ring" aria-hidden="true" />}
          </button>
        ))}
      </div>
      <Feedback value={game.feedback} />
    </div>
  );
}
