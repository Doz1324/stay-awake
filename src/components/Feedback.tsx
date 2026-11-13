export function Feedback({ value }: { value: { text: string; correct: boolean } | null }) {
  return (
    <p className={`feedback ${value && !value.correct ? 'wrong' : ''}`} role="status">
      {value?.text ?? '\u00a0'}
    </p>
  );
}
