export function Brand() {
  return (
    <span className="brand">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path
          d="M2 16h6l4-11 5 19 4-11h5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        stay awake<span className="brand-period">.</span>
      </span>
    </span>
  );
}
