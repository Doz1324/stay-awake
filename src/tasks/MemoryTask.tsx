import { useEffect, useRef, useState } from 'react';
import type { TaskProps } from './types';
import { digits } from './generators';
import { useTaskTools } from './useTaskTools';
import { Feedback } from '../components/Feedback';

export function MemoryTask({ canInteract, report }: TaskProps) {
  const [target, setTarget] = useState(() => digits(6));
  const [visible, setVisible] = useState(true);
  const [round, setRound] = useState(0);
  const [answer, setAnswer] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { flash, feedback, busy, later, cancel } = useTaskTools();
  useEffect(() => {
    const timer = later(() => setVisible(false), 1000);
    return () => cancel(timer);
  }, [round, later, cancel]);
  useEffect(() => {
    if (!visible) input.current?.focus();
  }, [visible]);
  const submit = () => {
    if (!canInteract() || visible || busy.current || !answer) return;
    const correct = answer === target;
    report({ correct });
    flash(
      correct,
      () => {
        setTarget(digits(Math.max(3, Math.min(10, target.length + (correct ? 1 : -1)))));
        setAnswer('');
        setVisible(true);
        setRound((value) => value + 1);
      },
      correct ? undefined : `✕ 刚才是 ${target}`,
    );
  };
  return (
    <div className="task">
      <h2>{visible ? '记住这些数字。' : '输入刚才看到的数字。'}</h2>
      <div className="task-prompt mono memory-string" aria-live="polite">
        {visible ? target : '·'.repeat(target.length)}
      </div>
      <form
        className="task-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={input}
          className="task-input mono"
          aria-label="记忆数字"
          inputMode="numeric"
          autoComplete="off"
          maxLength={10}
          disabled={visible}
          readOnly={!!feedback}
          value={answer}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.repeat || e.nativeEvent.isComposing)) e.preventDefault();
          }}
          onChange={(e) => {
            if (canInteract()) setAnswer(e.target.value.replace(/\D/g, ''));
          }}
        />
        <button className="submit-button" disabled={visible || !!feedback || !answer}>
          提交 <span className="muted">↵</span>
        </button>
      </form>
      <Feedback value={feedback} />
    </div>
  );
}
