import { useState } from 'react';
import type { TaskProps } from './types';
import { colors, stroopQuestion } from './generators';
import { useTaskKey, useTaskTools } from './useTaskTools';
import { Feedback } from '../components/Feedback';

export function StroopTask({ canInteract, report }: TaskProps) {
  const [question, setQuestion] = useState(stroopQuestion);
  const { flash, feedback, busy } = useTaskTools();
  const choose = (key: string) => {
    if (!canInteract() || busy.current) return;
    const correct = key === question.ink.key;
    report({ correct });
    flash(
      correct,
      () => setQuestion(stroopQuestion()),
      correct ? undefined : `✕ 实际颜色是${question.ink.label}`,
    );
  };
  useTaskKey((event) => {
    if (colors.some((color) => color.key === event.key.toLowerCase())) {
      event.preventDefault();
      choose(event.key.toLowerCase());
    }
  });
  return (
    <div className="task">
      <h2>判断文字的实际颜色，而不是词义。</h2>
      <div className={`task-prompt stroop-word ${question.ink.className}`}>{question.word}</div>
      <div className="stroop-options">
        {colors.map((color) => (
          <button key={color.key} onClick={() => choose(color.key)} disabled={!!feedback}>
            <kbd>{color.key.toUpperCase()}</kbd>
            {color.label}
          </button>
        ))}
      </div>
      <Feedback value={feedback} />
    </div>
  );
}
