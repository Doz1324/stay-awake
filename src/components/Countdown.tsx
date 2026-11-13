export function formatTime(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function Countdown({ ms }: { ms: number }) {
  return (
    <span className="mono" role="timer" aria-label={`剩余 ${formatTime(ms)}`}>
      {formatTime(ms)}
    </span>
  );
}
