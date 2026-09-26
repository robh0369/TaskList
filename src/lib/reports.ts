import type { Collections, Completion, Task } from '../api/types';
import { addDays, daysBetween, stampToDate, startOfWeek, today } from './dates';

export type Range = 7 | 30 | 90;

export interface MemberLoad {
  memberId: string;
  count: number;
  effort: number;
}

export interface WeekPoint {
  weekStart: string;
  count: number;
  onTime: number;
  /** Completions that had a due date — the denominator for on-time rate. */
  withDue: number;
}

export interface CategoryLoad {
  categoryId: string;
  count: number;
  effort: number;
}

export interface ReportData {
  totalDone: number;
  totalEffort: number;
  onTimeRate: number | null;
  workload: MemberLoad[];
  weekly: WeekPoint[];
  categories: CategoryLoad[];
  overdue: Task[];
  dueThisWeek: Task[];
  stale: Task[];
}

export function isOpen(t: Task): boolean {
  return !t.deleted && t.status === 'open';
}

function inRange(c: Completion, from: string, to: string): boolean {
  const d = stampToDate(c.completedAt);
  return d >= from && d <= to;
}

/**
 * "Both" completions split credit evenly so the workload view stays fair.
 */
export function buildReport(data: Collections, range: Range, now = today()): ReportData {
  const from = addDays(now, -(range - 1));
  const done = data.completions.filter((c) => !c.deleted && inRange(c, from, now));
  const members = data.members.filter((m) => !m.deleted);

  const loads = new Map<string, MemberLoad>(members.map((m) => [m.id, { memberId: m.id, count: 0, effort: 0 }]));
  for (const c of done) {
    const ids = c.completedBy === 'both' ? members.map((m) => m.id) : [c.completedBy];
    const share = 1 / Math.max(1, ids.length);
    for (const id of ids) {
      if (!loads.has(id)) loads.set(id, { memberId: id, count: 0, effort: 0 });
      const l = loads.get(id)!;
      l.count += share;
      l.effort += (c.effort || 1) * share;
    }
  }

  // Always show at least 6 weeks so the trend has shape, even for the 7-day range.
  const weeksBack = Math.max(6, Math.ceil(range / 7));
  const firstWeek = addDays(startOfWeek(now), -7 * (weeksBack - 1));
  const weekly: WeekPoint[] = [];
  for (let i = 0; i < weeksBack; i++) {
    weekly.push({ weekStart: addDays(firstWeek, 7 * i), count: 0, onTime: 0, withDue: 0 });
  }
  for (const c of data.completions) {
    if (c.deleted) continue;
    const d = stampToDate(c.completedAt);
    if (d < firstWeek || d > now) continue;
    const idx = Math.floor(daysBetween(firstWeek, d) / 7);
    const w = weekly[idx];
    if (!w) continue;
    w.count++;
    if (c.dueDate) {
      w.withDue++;
      if (d <= c.dueDate) w.onTime++;
    }
  }

  const cats = new Map<string, CategoryLoad>();
  for (const c of done) {
    const key = c.categoryId || '';
    if (!cats.has(key)) cats.set(key, { categoryId: key, count: 0, effort: 0 });
    const l = cats.get(key)!;
    l.count++;
    l.effort += c.effort || 1;
  }

  const withDue = done.filter((c) => c.dueDate);
  const onTime = withDue.filter((c) => stampToDate(c.completedAt) <= c.dueDate).length;

  const open = data.tasks.filter(isOpen);
  const weekEnd = addDays(now, 7);
  const byDue = (a: Task, b: Task) => a.dueDate.localeCompare(b.dueDate);

  return {
    totalDone: done.length,
    totalEffort: done.reduce((s, c) => s + (c.effort || 1), 0),
    onTimeRate: withDue.length ? onTime / withDue.length : null,
    workload: [...loads.values()],
    weekly,
    categories: [...cats.values()].sort((a, b) => b.count - a.count),
    overdue: open.filter((t) => t.dueDate && t.dueDate < now).sort(byDue),
    dueThisWeek: open.filter((t) => t.dueDate && t.dueDate >= now && t.dueDate <= weekEnd).sort(byDue),
    stale: open
      .filter((t) => !t.recurrence && daysBetween(stampToDate(t.updatedAt), now) >= 14)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
  };
}
