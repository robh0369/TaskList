// Dates are stored as local YYYY-MM-DD strings so a chore due "Tuesday" stays
// Tuesday regardless of time zone.

export function pad(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function today(): string {
  return toISODate(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function daysBetween(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/** Monday-based start of week, matching how most households plan. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayName(i: number): string {
  return WEEKDAYS[i];
}

export function shortDate(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Human label relative to today: "Today", "Tomorrow", "Fri", "3d overdue", "Oct 12". */
export function relativeLabel(iso: string, now = today()): string {
  const diff = daysBetween(now, iso);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d overdue`;
  if (diff < 7) return WEEKDAYS[parseISODate(iso).getDay()];
  return shortDate(iso);
}

export function nowStamp(): string {
  return new Date().toISOString();
}

/** Local calendar date of an ISO timestamp. */
export function stampToDate(stamp: string): string {
  return toISODate(new Date(stamp));
}
