import { useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Empty, Seg } from '../components/common';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { addDays, stampToDate, today } from '../lib/dates';
import { isMine, liveTasks, sortTasks } from '../store/selectors';
import { useStore } from '../store/store';

export function TodayView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data, settings } = useStore();
  const [scope, setScope] = useState<'mine' | 'all'>(settings.meId ? 'mine' : 'all');
  const ctx = useRowContext(data, onOpen);
  const t0 = today();
  const weekEnd = addDays(t0, 7);

  const open = liveTasks(data).filter((t) => !t.parentId && t.status === 'open' && (scope === 'all' || isMine(t, settings.meId)));
  const overdue = open.filter((t) => t.dueDate && t.dueDate < t0).sort(sortTasks);
  const dueToday = open.filter((t) => t.dueDate === t0).sort(sortTasks);
  const upcoming = open.filter((t) => t.dueDate > t0 && t.dueDate <= weekEnd).sort(sortTasks);
  const doneToday = liveTasks(data)
    .filter((t) => !t.parentId && t.status === 'done' && t.completedAt && stampToDate(t.completedAt) === t0 && (scope === 'all' || isMine(t, settings.meId)))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const doneCount = data.completions.filter((c) => !c.deleted && stampToDate(c.completedAt) === t0).length;

  const group = (title: string, tasks: Task[], danger = false) =>
    tasks.length > 0 && (
      <section class="section">
        <div class="section-h">
          <h2 class={danger ? 'danger' : ''}>{title}</h2>
          <span class="count">{tasks.length}</span>
        </div>
        <div class="card">
          {tasks.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}
        </div>
      </section>
    );

  const nothing = !overdue.length && !dueToday.length && !upcoming.length;

  return (
    <div class="content">
      {settings.meId && (
        <Seg label="Show" value={scope} onChange={setScope} options={[['mine', 'Mine'], ['all', 'Everyone']]} />
      )}
      {group('Overdue', overdue, true)}
      {group('Today', dueToday)}
      {group('Next 7 days', upcoming)}
      {nothing && (
        <Empty icon="☀️" title="All clear">
          {doneCount > 0 ? `${doneCount} done today. Nice work.` : 'Nothing due this week. Tap + to add something.'}
        </Empty>
      )}
      {group('Done today', doneToday)}
    </div>
  );
}
