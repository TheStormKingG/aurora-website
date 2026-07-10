/**
 * H.M. Aurora logo lockup — SVG interpretation of PDR §4.1 pending
 * commissioned source files: chrome/metallic wordmark, molecular
 * cluster forming the dot of "H.M", ECG pulse ring beneath, winged
 * caduceus merged into the final "A", letterspaced "HEALTH SYSTEMS".
 *
 * Dark backgrounds only (PDR §4.1). Decorative: consumers must pair
 * it with accessible text (see NavBar/Footer usage).
 */

const chromeStops = (
  <>
    <stop offset="0" stopColor="#F5F8FC" />
    <stop offset="0.38" stopColor="#C9D3E0" />
    <stop offset="0.52" stopColor="#8FA1BD" />
    <stop offset="0.66" stopColor="#E8EEF7" />
    <stop offset="1" stopColor="#AEBCCF" />
  </>
);

/** Molecular cluster — the "dot" of H.M (three bonded atoms + satellite). */
function Molecule({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} strokeLinecap="round">
      <path d="M0 0 L7 -4 M7 -4 L13 1 M7 -4 L8 -12" stroke="#2BD9F5" strokeWidth="1.4" opacity="0.9" />
      <circle cx="0" cy="0" r="3.1" fill="#2BD9F5" />
      <circle cx="7" cy="-4" r="2.2" fill="#C9D3E0" />
      <circle cx="13" cy="1" r="2.6" fill="#3FA9F5" />
      <circle cx="8" cy="-12" r="1.5" fill="#F5F8FC" />
    </g>
  );
}

/** Simplified winged caduceus, merged into the final "A". */
function Caduceus({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="none"
      stroke="#2BD9F5"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      {/* staff */}
      <path d="M0 -14 V16" stroke="#C9D3E0" />
      <circle cx="0" cy="-17" r="2.2" fill="#2BD9F5" stroke="none" />
      {/* entwined serpents */}
      <path d="M-6 -8 C 6 -4, -6 2, 5 7" opacity="0.95" />
      <path d="M6 -8 C -6 -4, 6 2, -5 7" opacity="0.7" />
      {/* wings */}
      <path d="M-3 -13 C -9 -18, -16 -18, -20 -14 M-3 -13 C -8 -14, -13 -13, -16 -10" stroke="#C9D3E0" />
      <path d="M3 -13 C 9 -18, 16 -18, 20 -14 M3 -13 C 8 -14, 13 -13, 16 -10" stroke="#C9D3E0" />
    </g>
  );
}

/** Full lockup: wordmark + ECG ring + HEALTH SYSTEMS + optional tagline. */
export function AuroraLogo({
  className,
  tagline = false,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <svg
      viewBox={`0 0 560 ${tagline ? 168 : 138}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="al-chrome" x1="0" y1="0" x2="0" y2="1">
          {chromeStops}
        </linearGradient>
        <linearGradient id="al-ecg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2BD9F5" stopOpacity="0" />
          <stop offset="0.2" stopColor="#2BD9F5" />
          <stop offset="0.8" stopColor="#3FA9F5" />
          <stop offset="1" stopColor="#7B3FF2" stopOpacity="0" />
        </linearGradient>
        <filter id="al-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Wordmark — chrome/metallic */}
      <text
        x="0"
        y="64"
        fill="url(#al-chrome)"
        fontFamily="var(--font-montserrat), ui-sans-serif, sans-serif"
        fontWeight="700"
        fontSize="62"
        letterSpacing="2"
      >
        H
        <tspan dx="16">M</tspan>
        <tspan dx="22">AURORA</tspan>
      </text>

      {/* Molecular cluster forming the dot of "H.M" */}
      <Molecule x={56} y={58} />

      {/* Winged caduceus merged into the final "A" (overlaid apex) */}
      <Caduceus x={521} y={36} scale={0.86} />

      {/* ECG pulse ring beneath the wordmark */}
      <path
        d="M8 92 H150 l10-16 14 30 12-24 8 10 h96 l8-10 14 26 12-20 8 8 h210"
        fill="none"
        stroke="url(#al-ecg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#al-glow)"
        className="ecg-path"
        style={{ strokeDasharray: 900, strokeDashoffset: 900 }}
      />

      {/* HEALTH SYSTEMS — letterspaced caps */}
      <text
        x="10"
        y="124"
        fill="#C9D3E0"
        fontFamily="var(--font-montserrat), ui-sans-serif, sans-serif"
        fontWeight="600"
        fontSize="21"
        letterSpacing="14"
      >
        HEALTH SYSTEMS
      </text>

      {tagline ? (
        <text
          x="10"
          y="154"
          fill="#2BD9F5"
          fontFamily="var(--font-montserrat), ui-sans-serif, sans-serif"
          fontWeight="600"
          fontSize="14"
          letterSpacing="4"
        >
          ILLUMINATING THE FUTURE OF CARE
        </text>
      ) : null}
    </svg>
  );
}

/** Compact mark — molecule + caduceus "A" on navy (favicon/app icon rule). */
export function AuroraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="am-chrome" x1="0" y1="0" x2="0" y2="1">
          {chromeStops}
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#060B22" />
      {/* A */}
      <path
        d="M18 50 L32 14 L46 50 M24.5 38.5 h15"
        fill="none"
        stroke="url(#am-chrome)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* wings at the apex */}
      <path
        d="M28 16 C 22 11, 15 11, 11 15 M36 16 C 42 11, 49 11, 53 15"
        fill="none"
        stroke="#C9D3E0"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* serpent curve across the A */}
      <path
        d="M24 30 C 32 26, 32 36, 40 32"
        fill="none"
        stroke="#2BD9F5"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* molecule satellite */}
      <circle cx="49" cy="22" r="2.6" fill="#2BD9F5" />
      <circle cx="54" cy="17" r="1.6" fill="#F5F8FC" />
      <path d="M49 22 L54 17" stroke="#2BD9F5" strokeWidth="1.2" />
    </svg>
  );
}
