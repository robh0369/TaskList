import { useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Empty, Seg } from '../components/common';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { daysBetween, stampToDate, today } from '../lib/dates';
import { isMine, liveTasks } from '../store/selectors';
import { useStore } from '../store/store';

const GROUPS = ['Today', 'Yesterday', 'This week', 'This month', 'Earlier'] as const;

function groupOf(stamp: string, now: string): (typeof GROUPS)[number] {
  const ago = daysBetween(stampToDate(stamp), now);
  if (ago <= 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  if (ago < 7) return 'This week';
  if (ago < 31) return 'This month';
  return 'Earlier';
}

/** Finished tasks, newest first. Tap the check to put one back on the list. */
export function DoneView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data, settings } = useStore();
  const ctx = useRowContext(data, onOpen);
  const [scope, setScope] = useState<'mine' | 'all'>(settings.meId ? 'mine' : 'all');
  const now = today();

  const done = liveTasks(data)
    .filter((t) => !t.parentId && t.status === 'done' && t.completedAt)
    .filter((t) => scope === 'all' || isMine(t, settings.meId) || t.completedBy === settings.meId)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return (
    <div class="content">
      {settings.meId && <Seg label="Show" value={scope} onChange={setScope} options={[['mine', 'Mine'], ['all', 'Everyone']]} />}
      {done.length === 0 && <Empty title="Nothing finished yet">Completed tasks show up here.</Empty>}
      {GROUPS.map((g) => {
        const items = done.filter((t) => groupOf(t.completedAt, now) === g);
        if (!items.length) return null;
        return (
          <section key={g} class="section">
            <div class="section-h">
              <h2>{g}</h2>
              <span class="count">{items.length}</span>
            </div>
            <div class="card">{items.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
          </section>
        );
      })}
    </div>
  );
}
