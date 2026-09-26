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
export const IconCamera = (p: P) => base(<><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></>, p);
export const IconSend = (p: P) => base(<path d="M4 12 20 4l-6 16-3-7z" />, p);
export const IconComment = (p: P) => base(<path d="M4 5h16v11H9l-5 4z" />, p);
export const IconTrash = (p: P) => base(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>, p);
export const IconFlag = (p: P) => base(<path d="M5 21V4h11l-2 4 2 4H5" />, p);
export const IconSub = (p: P) => base(<><path d="M6 4v10a3 3 0 0 0 3 3h9" /><path d="m15 14 3 3-3 3" /></>, p);
