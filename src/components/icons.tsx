/**
 * Thin-line icon set with cyan glow accents (PDR §4.4).
 * All icons are decorative by default (aria-hidden); pass a `title`
 * for semantic use.
 */

import type { SVGProps } from "react";

export type IconName =
  | "van"
  | "pulse"
  | "heart"
  | "sprout"
  | "building"
  | "sun"
  | "blocks"
  | "orbit"
  | "calendar"
  | "shield"
  | "lock"
  | "arrow"
  | "check"
  | "search"
  | "mail"
  | "phone"
  | "users"
  | "document"
  | "globe"
  | "eye"
  | "download"
  | "home";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  title?: string;
};

const paths: Record<IconName, React.ReactNode> = {
  van: (
    <>
      <path d="M2 16V8.5A1.5 1.5 0 0 1 3.5 7H13v9" />
      <path d="M13 9h4.2a1.5 1.5 0 0 1 1.2.6l2.3 3.1a1.5 1.5 0 0 1 .3.9V16h-2" />
      <circle cx="7" cy="16.5" r="1.8" />
      <circle cx="16.5" cy="16.5" r="1.8" />
      <path d="M8.8 16.5h5.9M2 16h3.2" />
      <path d="M7.5 9.5v3M6 11h3" />
    </>
  ),
  pulse: (
    <>
      <path d="M2.5 12h3.4l2-4.5 3.4 9 2.4-6 1.3 1.5h6.5" />
    </>
  ),
  heart: (
    <>
      <path d="M12 20s-7.2-4.6-9.3-9C1.2 7.8 3 4.8 6.2 4.8c2 0 3.4 1 4.3 2.5.9-1.5 2.3-2.5 4.3-2.5 3.2 0 5 3 3.5 6.2-2.1 4.4-9.3 9-9.3 9Z" />
      <path d="M7 11.5h2.4l1.1-2.2 1.7 4 1.1-1.8h3.2" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3.5-2.4-6-6.5-6C5.5 10.8 8 13 12 13Z" />
      <path d="M12 11c0-2.8 2-4.8 5.5-4.8 0 3.2-2.1 4.8-5.5 4.8Z" />
      <path d="M7 20h10" />
    </>
  ),
  building: (
    <>
      <path d="M4 20V8l8-4 8 4v12" />
      <path d="M2 20h20" />
      <path d="M9 20v-4h6v4" />
      <path d="M12 8.5v3M10.5 10h3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </>
  ),
  blocks: (
    <>
      <rect x="3.5" y="13" width="7" height="7" rx="1" />
      <rect x="13.5" y="13" width="7" height="7" rx="1" />
      <rect x="8.5" y="3.5" width="7" height="7" rx="1" />
    </>
  ),
  orbit: (
    <>
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-18 12 12)" />
      <circle cx="20" cy="8.6" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="M8 14h3M8 17h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.6 7 9 4.1-1.4 7-4.7 7-9V6l-7-2.5Z" />
      <path d="M9 12l2 2 4-4.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
      <circle cx="12" cy="15" r="1.3" />
    </>
  ),
  arrow: <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  check: <path d="m4.5 12.5 5 5L19.5 7" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),
  phone: (
    <path d="M6.8 3.5h2.4l1.4 4-2 1.6a12.5 12.5 0 0 0 5.8 5.8l1.7-2 4 1.3v2.5c0 1.6-1.3 2.9-2.9 2.7C10 18.5 5.5 14 4.1 6.8 3.8 5.1 5.1 3.5 6.8 3.5Z" />
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.5" />
      <path d="M3 19.5c.7-3.2 3.1-5 6-5s5.3 1.8 6 5" />
      <circle cx="17" cy="9.5" r="2.6" />
      <path d="M16.4 14.6c2.3.2 4 1.7 4.6 4.4" />
    </>
  ),
  document: (
    <>
      <path d="M6 3.5h8l4 4V20.5H6V3.5Z" />
      <path d="M14 3.5v4h4" />
      <path d="M9 12h6M9 15.5h6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.3 3.9 5.1 3.9 8.5s-1.3 6.2-3.9 8.5c-2.6-2.3-3.9-5.1-3.9-8.5s1.3-6.2 3.9-8.5Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" />
      <path d="M4.5 19.5h15" />
    </>
  ),
  home: (
    <>
      <path d="m4 11 8-7 8 7v9h-5.5v-5h-5v5H4v-9Z" />
    </>
  ),
};

export function Icon({ name, title, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}
