import type { Collections, Completion, Task } from '../api/types';
import { addDays, daysBetween, stampToDate, startOfWeek, today } from './dates';

export type Range = 7 | 30 | 90;

export interface MemberLoad {
  memberId: string;
  count: number;
}

export interface WeekPoint {
  weekStart: string;
  /** Tasks completed that week. */
  count: number;
  /** Tasks added that week. */
  added: number;
}

export interface CategoryLoad {
  categoryId: string;
  count: number;
}

export interface ReportData {
  totalDone: number;
  /** Tasks added in the range. */
  totalAdded: number;
  /** Open (not done) top-level tasks right now. */
  openCount: number;
  workload: MemberLoad[];
  weekly: WeekPoint[];
  categories: CategoryLoad[];
  /** Open tasks nobody has touched for two weeks or more, oldest first. */
  stale: Task[];
}

export function isOpen(t: Task): boolean {
  return !t.deleted && t.status === 'open';
}

function inRange(stamp: string, from: string, to: string): boolean {
  const d = stampToDate(stamp);
  return d >= from && d <= to;
}

/** "Both" completions split credit evenly so the workload view stays fair. */
export function buildReport(data: Collections, range: Range, now = today()): ReportData {
  const from = addDays(now, -(range - 1));
  const done = data.completions.filter((c: Completion) => !c.deleted && inRange(c.completedAt, from, now));
  const tasks = data.tasks.filter((t) => !t.deleted && !t.parentId);
  const members = data.members.filter((m) => !m.deleted);

  const loads = new Map<string, MemberLoad>(members.map((m) => [m.id, { memberId: m.id, count: 0 }]));
  for (const c of done) {
    const ids = c.completedBy === 'both' ? members.map((m) => m.id) : [c.completedBy];
    const share = 1 / Math.max(1, ids.length);
    for (const id of ids) {
      if (!loads.has(id)) loads.set(id, { memberId: id, count: 0 });
      loads.get(id)!.count += share;
    }
  }

  // Always show at least 6 weeks so the trend has shape, even for the 7-day range.
  const weeksBack = Math.max(6, Math.ceil(range / 7));
  const firstWeek = addDays(startOfWeek(now), -7 * (weeksBack - 1));
  const weekly: WeekPoint[] = [];
  for (let i = 0; i < weeksBack; i++) weekly.push({ weekStart: addDays(firstWeek, 7 * i), count: 0, added: 0 });
  const bucket = (stamp: string): WeekPoint | undefined => {
    const d = stampToDate(stamp);
    if (d < firstWeek || d > now) return undefined;
    return weekly[Math.floor(daysBetween(firstWeek, d) / 7)];
  };
  for (const c of data.completions) {
    const w = !c.deleted && bucket(c.completedAt);
    if (w) w.count++;
  }
  for (const t of tasks) {
    const w = t.createdAt && bucket(t.createdAt);
    if (w) w.added++;
  }

  const cats = new Map<string, CategoryLoad>();
  for (const c of done) {
    const key = c.categoryId || '';
    if (!cats.has(key)) cats.set(key, { categoryId: key, count: 0 });
    cats.get(key)!.count++;
  }

  const open = tasks.filter(isOpen);
  return {
    totalDone: done.length,
    totalAdded: tasks.filter((t) => t.createdAt && inRange(t.createdAt, from, now)).length,
    openCount: open.length,
    workload: [...loads.values()],
    weekly,
    categories: [...cats.values()].sort((a, b) => b.count - a.count),
    stale: open
      .filter((t) => daysBetween(stampToDate(t.updatedAt), now) >= 14)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)),
  };
}
