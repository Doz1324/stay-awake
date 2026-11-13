import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskProps } from './types';

interface Pace {
  initial: number;
  minimum: number;
  maximum: number;
}

/** One authoritative deadline per prompt, independent of animation and keyboard repeat. */
export function useRapidTask<T>(generate: (index: number) => T, props: TaskProps, pace: Pace) {
  const latest = useRef({ generate, props, pace });
  latest.current = { generate, props, pace };
  const [round, setRound] = useState(() => ({ index: 0, value: generate(0) }));
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string } | null>(null);
  const [remaining, setRemaining] = useState(1);
  const deadline = useRef(performance.now() + pace.initial);
  const windowMs = useRef(pace.initial);
  const streak = useRef(0);
  const locked = useRef(false);
  const nextTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settle = useCallback((answerCorrect: boolean) => {
    if (locked.current || !latest.current.props.canInteract()) return;
    const late = performance.now() >= deadline.current;
    const correct = answerCorrect && !late;
    locked.current = true;
    latest.current.props.report({ correct });
    setFeedback({
      correct,
      text: correct ? '✓' : late ? '时间到 · 跟上下一题' : '✕ 看清规则，再继续',
    });
    streak.current = correct ? streak.current + 1 : 0;
    const { minimum, maximum } = latest.current.pace;
    if (!correct) windowMs.current = Math.min(maximum, windowMs.current + 150);
    else if (streak.current >= 3) {
      windowMs.current = Math.max(minimum, windowMs.current - 100);
      streak.current = 0;
    }
    nextTimer.current = setTimeout(() => {
      if (!latest.current.props.canInteract()) return;
      setRound((previous) => ({
        index: previous.index + 1,
        value: latest.current.generate(previous.index + 1),
      }));
      deadline.current = performance.now() + windowMs.current;
      locked.current = false;
      setFeedback(null);
      setRemaining(1);
    }, 140);
  }, []);
  useEffect(() => {
    const ticker = setInterval(() => {
      if (locked.current || !latest.current.props.canInteract()) return;
      setRemaining(Math.max(0, (deadline.current - performance.now()) / windowMs.current));
      if (performance.now() >= deadline.current) settle(false);
    }, 40);
    return () => {
      clearInterval(ticker);
      clearTimeout(nextTimer.current);
    };
  }, [settle]);
  return {
    round: round.value,
    index: round.index,
    answer: settle,
    feedback,
    remaining,
    locked: !!feedback,
  };
}
