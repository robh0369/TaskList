import type { Category, Collections, Member, Project, Task } from '../api/types';
import { today } from '../lib/dates';

export function activeMembers(d: Collections): Member[] {
  return d.members.filter((m) => !m.deleted);
}

export function activeCategories(d: Collections): Category[] {
  return d.categories.filter((c) => !c.deleted).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function activeProjects(d: Collections): Project[] {
  return d.projects.filter((p) => !p.deleted);
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

export function sortTasks(a: Task, b: Task): number {
  // Open first, then dated before undated, then by date, then priority.
  if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
  if (!!a.dueDate !== !!b.dueDate) return a.dueDate ? -1 : 1;
  if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  const pr = { high: 0, med: 1, low: 2 };
  if (a.priority !== b.priority) return pr[a.priority] - pr[b.priority];
  return a.createdAt.localeCompare(b.createdAt);
}

export function projectProgress(d: Collections, projectId: string) {
  const tasks = d.tasks.filter((t) => !t.deleted && t.projectId === projectId);
  const done = tasks.filter((t) => t.status === 'done').length;
  return { total: tasks.length, done, pct: tasks.length ? done / tasks.length : 0 };
}

export function dueClass(date: string, now = today()): string {
  if (!date) return '';
  if (date < now) return 'due-overdue';
  if (date === now) return 'due-today';
  return '';
}
