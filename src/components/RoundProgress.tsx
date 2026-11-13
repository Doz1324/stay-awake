export function RoundProgress({ remaining }: { remaining: number }) {
  return (
    <div className="round-progress" aria-hidden="true">
      <div style={{ width: `${Math.max(0, Math.min(1, remaining)) * 100}%` }} />
    </div>
  );
}
