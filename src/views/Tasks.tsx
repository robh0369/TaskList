import { useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Avatar, Empty } from '../components/common';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { activeCategories, activeMembers, activeProjects, liveTasks, sortTasks } from '../store/selectors';
import { useStore } from '../store/store';

type Status = 'open' | 'done' | 'all';

export function TasksView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data } = useStore();
  const ctx = useRowContext(data, onOpen);
  const [q, setQ] = useState('');
  const [who, setWho] = useState('');
  const [cat, setCat] = useState('');
  const [proj, setProj] = useState('');
  const [status, setStatus] = useState<Status>('open');
  const [repeating, setRepeating] = useState(false);

  const members = activeMembers(data);
  const categories = activeCategories(data);
  const projects = activeProjects(data);

  const needle = q.trim().toLowerCase();
  const tasks = liveTasks(data)
    .filter((t) => !t.parentId)
    .filter((t) => status === 'all' || t.status === status)
    .filter((t) => !who || t.assigneeId === who || (who !== 'none' && t.assigneeId === 'both') || (who === 'none' && !t.assigneeId))
    .filter((t) => !cat || t.categoryId === cat)
    .filter((t) => !proj || t.projectId === proj)
    .filter((t) => !repeating || !!t.recurrence)
    .filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.notes.toLowerCase().includes(needle))
    .sort(status === 'done' ? (a, b) => b.completedAt.localeCompare(a.completedAt) : sortTasks);

  const toggle = (cur: string, v: string, set: (v: string) => void) => set(cur === v ? '' : v);

  return (
    <div class="content">
      <input class="search" type="search" placeholder="Search tasks" value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label="Search tasks" />

      <div class="chips" style={{ marginTop: 10 }} role="group" aria-label="Status">
        {(['open', 'done', 'all'] as Status[]).map((s) => (
          <button key={s} class="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === 'open' ? 'To do' : s === 'done' ? 'Done' : 'All'}
          </button>
        ))}
        <button class="chip" aria-pressed={repeating} onClick={() => setRepeating(!repeating)}>↻ Recurring</button>
      </div>
      <div class="chips" role="group" aria-label="Assignee">
        {members.map((m) => (
          <button key={m.id} class="chip" aria-pressed={who === m.id} onClick={() => toggle(who, m.id, setWho)}>
            <Avatar member={m} size="sm" /> {m.name}
          </button>
        ))}
        <button class="chip" aria-pressed={who === 'none'} onClick={() => toggle(who, 'none', setWho)}>Unassigned</button>
      </div>
      <div class="chips" role="group" aria-label="Category">
        {categories.map((c) => (
          <button key={c.id} class="chip" aria-pressed={cat === c.id} onClick={() => toggle(cat, c.id, setCat)}>
            {c.icon} {c.name}
          </button>
        ))}
      </div>
      {projects.length > 0 && (
        <div class="chips" role="group" aria-label="Project">
          {projects.map((p) => (
            <button key={p.id} class="chip" aria-pressed={proj === p.id} onClick={() => toggle(proj, p.id, setProj)}>
              <i class="dot" style={{ background: p.color }} /> {p.name}
            </button>
          ))}
        </div>
      )}

      <section class="section">
        <div class="section-h">
          <h2>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</h2>
        </div>
        {tasks.length ? (
          <div class="card">{tasks.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
        ) : (
          <Empty icon="🔍" title="No matching tasks">Try clearing a filter.</Empty>
        )}
      </section>
    </div>
  );
}
