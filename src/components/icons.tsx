import type { SVGProps } from "react";

const PATHS = {
  home: <><path d="M3 10.7 12 3l9 7.7" /><path d="M5.5 9.4V21h13V9.4" /><path d="M9.8 21v-6h4.4v6" /></>,
  target: <><circle cx="12" cy="12" r="8.2" /><circle cx="12" cy="12" r="4.6" /><circle cx="12" cy="12" r="1" /></>,
  heart: <path d="M12 20.4S3.8 15.6 3.8 10.2A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 8.2 2.8c0 5.4-8.2 10.2-8.2 10.2Z" />,
  chart: <><path d="M4 20V11" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20H2" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13A4 4 0 0 1 19 7a4 4 0 0 1-3 3.87" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  trophy: <><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4v2a3 3 0 0 0 3 3" /><path d="M17 6h3v2a3 3 0 0 1-3 3" /></>,
  zap: <path d="m13 2-8 12h6l-1 8 8-12h-6l1-8Z" />,
  flame: <path d="M12 22c4 0 7-2.8 7-6.5 0-4-3-6.3-4.5-8.5C13 4.6 12.5 2 12.5 2S11 5 9.5 7.5C8 10 5 11.6 5 15.5 5 19.2 8 22 12 22Z" />,
  medal: <><path d="M7.5 3h9l-1.6 6.2h-5.8L7.5 3Z" /><circle cx="12" cy="15" r="5.4" /><path d="m12 12.4 1 2 2.2.3-1.6 1.6.4 2.2-2-1.1-2 1.1.4-2.2-1.6-1.6 2.2-.3 1-2Z" /></>,
  crown: <><path d="M3 7.5 7.5 12 12 4.5 16.5 12 21 7.5 19 19H5L3 7.5Z" /><path d="M5 19h14" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  check: <path d="m20 6-11 11-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m8.8 11.6 2.2 2.2 4.2-4.4" /></>,
  rocket: <><path d="M12 2.6c3 2 4.8 5.4 4.8 9.1L12 16.4l-4.8-4.7c0-3.7 1.8-7.1 4.8-9.1Z" /><path d="M7.2 13.9 4 17l1 4 3.8-1 2.9-3.1" /><path d="m16.8 13.9 3.2 3.1-1 4-3.8-1-2.9-3.1" /><circle cx="12" cy="9" r="1.6" /></>,
  handshake: <><path d="m11 17 1.8 1.8 4-4" /><path d="M3 11.6 7 7.6l5 4 5-4 4 4-5.2 5.2-3.8-2.9-2.4 2.4-2.4-2.4" /><path d="M7 7.6 4.6 10 3 8.4 5.4 6" /></>,
  globe: <><circle cx="12" cy="12" r="9.2" /><path d="M2.8 12h18.4" /><path d="M12 2.8a14.5 14.5 0 0 1 0 18.4 14.5 14.5 0 0 1 0-18.4Z" /></>,
  code: <><path d="m8 8-4 4 4 4" /><path d="m16 8 4 4-4 4" /><path d="m14 4-4 16" /></>,
  pen: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
  compass: <><circle cx="12" cy="12" r="9.2" /><path d="m16.2 7.8-2.4 6-6 2.4 2.4-6 6-2.4Z" /></>,
  calendar: <><path d="M8 2.5v4" /><path d="M16 2.5v4" /><path d="M3 10h18" /><rect x="3" y="4" width="18" height="17" rx="2.5" /></>,
  diamond: <><path d="m12 2.5 9 6.8-9 12.2L3 9.3l9-6.8Z" /><path d="m3 9.3 9 3.3 9-3.3" /><path d="m7.5 5.9 4.5 6.7 4.5-6.7" /></>,
  star: <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.7l6.2-.9L12 3Z" />,
  growth: <><path d="m3 17 6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></>,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  "arrow-right": <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  "arrow-up-right": <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="9.2" /><path d="M12 7v5.4l3.4 2" /></>,
  upload: <><path d="M12 16.5V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></>,
  lock: <><rect x="4" y="10.5" width="16" height="10.5" rx="2.2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21v-1a6.5 6.5 0 0 1 6.5-6.5h2A6.5 6.5 0 0 1 19.5 20v1" /></>,
  sparkles: <><path d="m12 3 1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" /></>,
  alert: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9.5V14" /><path d="M12 17.2h.01" /></>,
  filter: <path d="M3 5h18l-7.2 8.2V21l-3.6-2v-5.8L3 5Z" />,
  link: <><path d="M10.5 13.5a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1.2 1.2" /><path d="M13.5 10.5a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1.2-1.2" /></>,
  edit: <><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" /></>,
  trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" /><path d="M10 11v6M14 11v6" /></>,
  download: <><path d="M12 3v13" /><path d="m7 11 5 5 5-5" /><path d="M4 21h16" /></>,
  trend: <><path d="m3 16 5-5 4 4 7-7" /><path d="M14 8h5v5" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="14" rx="2.2" /><path d="M8.5 7V5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></>,
  play: <path d="m7 4 13 8-13 8V4Z" />,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /><path d="M12 8v4.5l3 1.8" /></>,
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number | string };

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}

export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5f3ff" />
          <stop offset="55%" stopColor="#c4a4ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="brand-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a2140" />
          <stop offset="100%" stopColor="#0b0b13" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="url(#brand-plate)" stroke="#3b2b57" />
      <path d="M24 8.5 38.5 38h-7.6l-3-6.4h-7.8L17.1 38H9.5L24 8.5Zm0 10.2-2.4 6.4h4.8L24 18.7Z" fill="url(#brand-grad)" />
    </svg>
  );
}
