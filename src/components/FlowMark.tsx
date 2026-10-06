export function FlowMark() {
  return (
    <svg className="flow-mark" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="none" stroke="currentColor" strokeOpacity="0.35" />
      <path d="M5 18c4-6 8-6 11 0s7 6 11 0" fill="none" stroke="url(#flow-mark-tide)" strokeWidth="2.4" strokeLinecap="round" />
      <defs>
        <linearGradient id="flow-mark-tide" x1="5" x2="27" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#19d9bf" />
          <stop offset="1" stopColor="#7a3cff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
