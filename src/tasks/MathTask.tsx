import { useRef, useState } from 'react';
import type { TaskProps } from './types';
import { mathQuestion } from './generators';
import { useTaskTools } from './useTaskTools';
import { Feedback } from '../components/Feedback';

export function MathTask({ canInteract, report }: TaskProps) {
  const [question, setQuestion] = useState(mathQuestion);
  const [answer, setAnswer] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { flash, feedback, busy } = useTaskTools();
  const submit = () => {
    if (!canInteract() || busy.current || !answer.trim()) return;
    const correct = Number(answer) === question.answer;
    report({ correct });
    flash(
      correct,
      () => {
        setQuestion(mathQuestion());
        setAnswer('');
        input.current?.focus();
      },
      correct ? undefined : `✕ 答案是 ${question.answer}`,
    );
  };
  return (
    <div className="task">
      <h2>快速计算，按 Enter 提交。</h2>
      <div className="task-prompt mono">{question.prompt}</div>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          ref={input}
          className="task-input mono"
          aria-label="口算答案"
          inputMode="numeric"
          autoComplete="off"
          value={answer}
          readOnly={!!feedback}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.repeat || e.nativeEvent.isComposing)) e.preventDefault();
          }}
          onChange={(e) => {
            if (canInteract()) setAnswer(e.target.value.replace(/[^0-9-]/g, ''));
          }}
        />
        <button className="submit-button" disabled={!!feedback || !answer.trim()}>
          提交 <span className="muted">↵</span>
        </button>
      </form>
      <Feedback value={feedback} />
    </div>
  );
}
