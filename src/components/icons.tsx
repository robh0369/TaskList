import type { JSX } from 'preact';

type P = JSX.SVGAttributes<SVGSVGElement>;

const base = (d: JSX.Element, props: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...props}>
    {d}
  </svg>
);

export const IconToday = (p: P) => base(<><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M3 9h18M8 2v4M16 2v4" /><circle cx="12" cy="15" r="1.6" fill="currentColor" /></>, p);
export const IconList = (p: P) => base(<><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1.2" fill="currentColor" /><circle cx="4.5" cy="12" r="1.2" fill="currentColor" /><circle cx="4.5" cy="18" r="1.2" fill="currentColor" /></>, p);
export const IconFolder = (p: P) => base(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />, p);
export const IconChart = (p: P) => base(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>, p);
export const IconGear = (p: P) => base(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>, p);
export const IconPlus = (p: P) => base(<path d="M12 5v14M5 12h14" />, p);
export const IconCheck = (p: P) => base(<path d="m5 12.5 4.5 4.5L19 7.5" stroke-width="3" />, p);
export const IconRepeat = (p: P) => base(<><path d="M17 2l4 4-4 4" /><path d="M3 11V10a4 4 0 0 1 4-4h14M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></>, p);
export const IconClose = (p: P) => base(<path d="M6 6l12 12M18 6 6 18" />, p);
export const IconBack = (p: P) => base(<path d="m15 18-6-6 6-6" />, p);
export const IconSend = (p: P) => base(<path d="M4 12 20 4l-6 16-3-7z" />, p);
export const IconComment = (p: P) => base(<path d="M4 5h16v11H9l-5 4z" />, p);
export const IconTrash = (p: P) => base(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>, p);
export const IconFlag = (p: P) => base(<path d="M5 21V4h11l-2 4 2 4H5" />, p);
export const IconSub = (p: P) => base(<><path d="M6 4v10a3 3 0 0 0 3 3h9" /><path d="m15 14 3 3-3 3" /></>, p);
export const IconGrip = (p: P) => base(<><circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none" /></>, p);
export const IconSearch = (p: P) => base(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>, p);
export const IconCheckCircle = (p: P) => base(<><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9.5" /></>, p);
export const IconInbox = (p: P) => base(<><path d="M3 13l2.5-7.5A2 2 0 0 1 7.4 4h9.2a2 2 0 0 1 1.9 1.5L21 13v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></>, p);
export const IconLock = (p: P) => base(<><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>, p);
export const IconCloud = (p: P) => base(<path d="M7 18h10.5a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.3 9.1 4.5 4.5 0 0 0 7 18z" />, p);
export const IconUser = (p: P) => base(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, p);
export const IconDownload = (p: P) => base(<><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>, p);

/** App mark: a checklist, matching the home-screen icon. */
export const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
    <rect width="512" height="512" rx="112" fill="var(--accent)" />
    <g fill="none" stroke="var(--accent-ink)" stroke-linecap="round" stroke-linejoin="round">
      <rect x="108" y="130" width="60" height="60" rx="16" stroke-width="18" />
      <path d="m122 161 13 13 22-26" stroke-width="18" />
      <path d="M214 160h186" stroke-width="26" />
      <rect x="108" y="226" width="60" height="60" rx="16" stroke-width="18" />
      <path d="m122 257 13 13 22-26" stroke-width="18" />
      <path d="M214 256h186" stroke-width="26" />
      <rect x="108" y="322" width="60" height="60" rx="16" stroke-width="18" opacity="0.7" />
      <path d="M214 352h126" stroke-width="26" opacity="0.7" />
    </g>
  </svg>
);
export const IconPlay = (p: P) => base(<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />, p);
export const IconChevron = (p: P) => base(<path d="m9 6 6 6-6 6" />, p);
