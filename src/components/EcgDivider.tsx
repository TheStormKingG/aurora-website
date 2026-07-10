/**
 * ECG-pulse divider — the recurring brand motif (PDR §4.4), drawn with
 * the signature cyan→blue→violet gradient (§4.2: gradients may be used
 * in section dividers).
 */
export function EcgDivider({
  className = "",
  animate = false,
  reveal = false,
}: {
  className?: string;
  /** Draw on mount (page load). */
  animate?: boolean;
  /** Draw when an ancestor <Reveal> gains .is-revealed (scroll). */
  reveal?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 220 24"
      className={`h-5 w-44 ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ecgd" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2BD9F5" />
          <stop offset="0.55" stopColor="#3FA9F5" />
          <stop offset="1" stopColor="#7B3FF2" />
        </linearGradient>
      </defs>
      <path
        d="M2 13 H62 l7-9 9 17 7-13 5 5 h34 l6-7 8 13 6-10 4 4 h70"
        fill="none"
        stroke="url(#ecgd)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "ecg-path" : reveal ? "ecg-reveal-path" : undefined}
      />
    </svg>
  );
}
