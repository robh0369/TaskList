import type { Category, Collections, Member, Task } from '../api/types';
import { rankOf } from '../lib/rank';

export function activeMembers(d: Collections): Member[] {
  return d.members.filter((m) => !m.deleted);
}

export function activeCategories(d: Collections): Category[] {
  return d.categories.filter((c) => !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function liveTasks(d: Collections): Task[] {
  return d.tasks.filter((t) => !t.deleted);
}

export function byId<T extends { id: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

/** True if the task is assigned to this member directly or to both. */
export function isMine(t: Task, meId: string): boolean {
  return !meId || t.assigneeId === meId || t.assigneeId === 'both' || t.assigneeId === '';
}

const PRIORITY_ORDER = { high: 0, med: 1, low: 2 };

/**
 * Open first, then High → Medium → Low, then the position set by dragging,
 * then oldest first (so untouched sections keep their waiting-longest order).
 */
export function sortTasks(a: Task, b: Task): number {
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  const r = rankOf(a) - rankOf(b);
  if (r !== 0) return r;
  return a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}
