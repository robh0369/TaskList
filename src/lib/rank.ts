import type { Priority, Task } from '../api/types';

/**
 * A task's position within its priority section. Lower shows higher up.
 *
 * Stored in the Tasks tab's `effort` column, which the app no longer uses for
 * effort points; reusing it avoids changing the Sheet layout (and redeploying
 * the Apps Script). Tasks created before reordering existed all hold 2, so
 * they tie and fall back to oldest-first until a section is reordered.
 */
export function rankOf(t: Task): number {
  return Number.isFinite(t.effort) ? t.effort : 0;
}

/** Spacing used when renumbering a section, and when placing at either end. */
export const STEP = 1024;
/** Below this gap between neighbors, renumber the section instead of halving. */
const MIN_GAP = 1e-6;

export interface MovePlan {
  /** The moved task with its new priority and rank. */
  task: Task;
  /** Other tasks in the target section whose rank changed (only when renumbering). */
  renumbered: Task[];
}

/**
 * Plans moving `task` into the `priority` section, just before `beforeId`
 * (or just after `afterId` when dropping below the last visible task, or at the
 * end when both are null).
 *
 * `lane` is every open task currently in the target section, in display order.
 * Returns null when the drop leaves the task exactly where it already is.
 */
export function planMove(lane: Task[], task: Task, priority: Priority, beforeId: string | null, afterId: string | null): MovePlan | null {
  const others = lane.filter((t) => t.id !== task.id);

  let index: number;
  if (beforeId && others.some((t) => t.id === beforeId)) index = others.findIndex((t) => t.id === beforeId);
  else if (afterId && others.some((t) => t.id === afterId)) index = others.findIndex((t) => t.id === afterId) + 1;
  else index = others.length;

  // Same section, same neighbors: nothing to do.
  if (task.priority === priority) {
    const current = lane.findIndex((t) => t.id === task.id);
    if (current === index) return null;
  }

  const prev = others[index - 1];
  const next = others[index];
  let rank: number | null;
  if (prev && next) {
    const a = rankOf(prev);
    const b = rankOf(next);
    rank = b - a > MIN_GAP ? (a + b) / 2 : null;
  } else if (next) {
    rank = rankOf(next) - STEP;
  } else if (prev) {
    rank = rankOf(prev) + STEP;
  } else {
    rank = rankOf(task);
  }

  if (rank !== null) return { task: { ...task, priority, effort: rank }, renumbered: [] };

  // Neighbors tie or the gap is exhausted: renumber the whole section in display order.
  const order = [...others.slice(0, index), task, ...others.slice(index)];
  let moved = task;
  const renumbered: Task[] = [];
  order.forEach((t, i) => {
    const r = (i + 1) * STEP;
    if (t.id === task.id) moved = { ...task, priority, effort: r };
    else if (rankOf(t) !== r) renumbered.push({ ...t, effort: r });
  });
  return { task: moved, renumbered };
}
