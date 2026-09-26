import { useMemo } from 'preact/hooks';
import type { Collections, Task } from '../api/types';
import { activeMembers, byId } from '../store/selectors';
import type { RowContext } from './TaskRow';

export function useRowContext(data: Collections, onOpen: (t: Task) => void): RowContext {
  return useMemo(() => {
    const commentCounts = new Map<string, number>();
    for (const c of data.comments) if (!c.deleted) commentCounts.set(c.taskId, (commentCounts.get(c.taskId) ?? 0) + 1);
    const subtaskCounts = new Map<string, { done: number; total: number }>();
    for (const t of data.tasks) {
      if (t.deleted || !t.parentId) continue;
      const s = subtaskCounts.get(t.parentId) ?? { done: 0, total: 0 };
      s.total++;
      if (t.status === 'done') s.done++;
      subtaskCounts.set(t.parentId, s);
    }
    return {
      members: activeMembers(data),
      categories: byId(data.categories),
      projects: byId(data.projects),
      commentCounts,
      subtaskCounts,
      onOpen,
    };
  }, [data, onOpen]);
}
