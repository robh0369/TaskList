import { useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Empty, Seg } from '../components/common';
import { IconRepeat, IconSearch } from '../components/icons';
import { RankedList } from '../components/RankedList';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { activeCategories, activeMembers, liveTasks, sortTasks } from '../store/selectors';
import { useStore } from '../store/store';

type Status = 'open' | 'done' | 'all';
type Mode = 'priority' | 'list';

const MODE_KEY = 'tasklist.tasksMode';
function readMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'list' ? 'list' : 'priority';
  } catch {
    return 'priority';
  }
}

export function TasksView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data } = useStore();
  const ctx = useRowContext(data, onOpen);
  const [mode, setModeState] = useState<Mode>(readMode);
  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* per-device preference only */
    }
  };
  const [q, setQ] = useState('');
  const [who, setWho] = useState('');
  const [cat, setCat] = useState('');
  const [status, setStatus] = useState<Status>('open');
  const [repeating, setRepeating] = useState(false);

  const members = activeMembers(data);
  const categories = activeCategories(data);

  const needle = q.trim().toLowerCase();
  const tasks = liveTasks(data)
    .filter((t) => !t.parentId)
    .filter((t) => (mode === 'priority' ? t.status === 'open' : status === 'all' || t.status === status))
    .filter((t) => !who || t.assigneeId === who || (who !== 'none' && t.assigneeId === 'both') || (who === 'none' && !t.assigneeId))
    .filter((t) => !cat || t.categoryId === cat)
    .filter((t) => !repeating || !!t.recurrence)
    .filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.notes.toLowerCase().includes(needle))
    .sort(status === 'done' && mode === 'list' ? (a, b) => b.completedAt.localeCompare(a.completedAt) : sortTasks);

  const filtered = !!(needle || who || cat || repeating);

  return (
    <div class="content">
      <Seg label="View" value={mode} onChange={setMode} options={[['priority', 'Priority'], ['list', 'List']]} />

      <div class="filters">
        <label class="search-wrap">
          <IconSearch />
          <input class="search" type="search" placeholder="Search" value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label="Search tasks" />
        </label>
        <div class="filter-row">
          <select class={`pill ${who ? 'on' : ''}`} value={who} onChange={(e) => setWho(e.currentTarget.value)} aria-label="Assignee" data-testid="filter-who">
            <option value="">Everyone</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            <option value="none">Unassigned</option>
          </select>
          <select class={`pill ${cat ? 'on' : ''}`} value={cat} onChange={(e) => setCat(e.currentTarget.value)} aria-label="Category" data-testid="filter-category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {mode === 'list' && (
            <select class={`pill ${status !== 'open' ? 'on' : ''}`} value={status} onChange={(e) => setStatus(e.currentTarget.value as Status)} aria-label="Status">
              <option value="open">To do</option>
              <option value="done">Done</option>
              <option value="all">All</option>
            </select>
          )}
          <button class={`pill ${repeating ? 'on' : ''}`} aria-pressed={repeating} onClick={() => setRepeating(!repeating)}>
            <IconRepeat /> Recurring
          </button>
        </div>
      </div>

      {mode === 'priority' ? (
        tasks.length || filtered ? (
          <RankedList tasks={tasks} ctx={ctx} />
        ) : (
          <Empty title="No open tasks">Tap + to add one.</Empty>
        )
      ) : (
        <section class="section">
          <div class="section-h">
            <h2>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</h2>
          </div>
          {tasks.length ? (
            <div class="card">{tasks.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
          ) : (
            <Empty title="No matching tasks">Try clearing a filter.</Empty>
          )}
        </section>
      )}
    </div>
  );
}
