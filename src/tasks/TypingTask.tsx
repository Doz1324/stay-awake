import { useRef, useState } from 'react';
import type { TaskProps } from './types';
import { phrases } from '../data/phrases';
import { randomInt } from './generators';
import { useTaskTools } from './useTaskTools';
import { Feedback } from '../components/Feedback';

export function TypingTask({ canInteract, report }: TaskProps) {
  const [index, setIndex] = useState(() => randomInt(0, phrases.length - 1));
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { flash, feedback, busy } = useTaskTools();
  const phrase = phrases[index];
  const change = (text: string) => {
    if (!canInteract() || busy.current) return;
    // Count inserted characters only. Backspacing fixes the visible text, not historical accuracy.
    let prefix = 0;
    while (prefix < value.length && prefix < text.length && value[prefix] === text[prefix])
      prefix++;
    let suffix = 0;
    while (
      suffix < value.length - prefix &&
      suffix < text.length - prefix &&
      value[value.length - 1 - suffix] === text[text.length - 1 - suffix]
    )
      suffix++;
    for (let i = prefix; i < text.length - suffix; i++)
      report({ correct: text[i] === phrase[i], characters: 1 });
    setValue(text);
    if (text === phrase)
      flash(
        true,
        () => {
          setIndex((previous) => (previous + randomInt(1, phrases.length - 1)) % phrases.length);
          setValue('');
          input.current?.focus();
        },
        '✓ 保持专注',
      );
  };
  return (
    <div className="task">
      <h2>照着输入，让手和注意力一起回来。</h2>
      <div className="typing-prompt" aria-label={phrase}>
        {[...phrase].map((letter, i) => (
          <span
            key={i}
            className={`${i >= value.length ? 'pending' : value[i] === letter ? 'correct' : 'incorrect'} ${i === value.length ? 'cursor' : ''}`}
          >
            {letter}
          </span>
        ))}
      </div>
      <input
        autoFocus
        ref={input}
        className="task-input typing-input"
        aria-label="输入英文词组"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        maxLength={phrase.length}
        value={value}
        readOnly={!!feedback}
        onPaste={(e) => e.preventDefault()}
        onChange={(e) => change(e.target.value)}
      />
      <Feedback value={feedback} />
    </div>
  );
}
