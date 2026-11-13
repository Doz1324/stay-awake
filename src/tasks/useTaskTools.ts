import { useCallback, useEffect, useRef, useState } from 'react';

export function useTaskTools() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);
  const busy = useRef(false);
  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach(clearTimeout);
      active.clear();
    };
  }, []);
  const later = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      callback();
    }, delay);
    timers.current.add(id);
    return id;
  }, []);
  const cancel = useCallback((id: ReturnType<typeof setTimeout> | undefined) => {
    if (id !== undefined) {
      clearTimeout(id);
      timers.current.delete(id);
    }
  }, []);
  const flash = useCallback(
    (correct: boolean, next: () => void, text?: string) => {
      busy.current = true;
      setFeedback({ correct, text: text ?? (correct ? '✓ 正确' : '✕ 再集中一点') });
      later(() => {
        setFeedback(null);
        busy.current = false;
        next();
      }, 320);
    },
    [later],
  );
  return { later, cancel, feedback, busy, flash };
}
export function useTaskKey(handler: (event: KeyboardEvent) => void) {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.repeat && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey)
        latest.current(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
