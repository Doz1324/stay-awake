import { useEffect, useRef, useState } from 'react';
import type { TaskProps } from './types';
import { useTaskKey, useTaskTools } from './useTaskTools';
import { Feedback } from '../components/Feedback';

export function ReactionTask({ canInteract, report }: TaskProps) {
  const [phase, setPhase] = useState<'waiting' | 'ready' | 'feedback'>('waiting');
  const phaseRef = useRef(phase);
  const readyAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const gate = useRef(canInteract);
  gate.current = canInteract;
  const { later, cancel, feedback, flash, busy } = useTaskTools();
  const beginRound = () => {
    phaseRef.current = 'waiting';
    setPhase('waiting');
    timer.current = later(
      () => {
        if (!gate.current()) return;
        readyAt.current = performance.now();
        phaseRef.current = 'ready';
        setPhase('ready');
      },
      1000 + Math.random() * 3000,
    );
  };
  useEffect(() => {
    beginRound(); /* Initial round; subsequent rounds are event driven. */
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const respond = () => {
    if (!canInteract() || busy.current || phaseRef.current === 'feedback') return;
    const correct = phaseRef.current === 'ready';
    const reactionMs = correct ? Math.round(performance.now() - readyAt.current) : undefined;
    cancel(timer.current);
    phaseRef.current = 'feedback';
    setPhase('feedback');
    report({ correct, reactionMs });
    flash(correct, beginRound, correct ? `${reactionMs} ms` : 'Too early · 请等待绿色');
  };
  useTaskKey((event) => {
    if (event.code !== 'Space') return;
    if (
      event.target instanceof HTMLButtonElement &&
      !event.target.classList.contains('reaction-target')
    )
      return;
    event.preventDefault();
    respond();
  });
  return (
    <div className="task">
      <h2>看到绿色，再按 Space 或点击。</h2>
      <button
        className={`reaction-target ${phase === 'ready' ? 'ready' : ''}`}
        onClick={respond}
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
        aria-label={phase === 'ready' ? '现在点击' : '等待绿色'}
      >
        {phase === 'ready' ? '现在！' : phase === 'waiting' ? '等待绿色…' : '稍等片刻'}
        <small>{phase === 'ready' ? 'SPACE / 点击' : '保持注意，不要抢先'}</small>
      </button>
      <Feedback value={feedback} />
    </div>
  );
}
