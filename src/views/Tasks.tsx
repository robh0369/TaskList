import { useMemo, useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Empty, Seg } from '../components/common';
import { IconSearch } from '../components/icons';
import { RankedList } from '../components/RankedList';
import { useRowContext } from '../components/useRowContext';
import { planStarterImport, STARTER_TASKS } from '../lib/starter';
import { activeCategories, isMine, liveTasks, sortTasks } from '../store/selectors';
import { importStarter, showToast, useStore } from '../store/store';

type Scope = 'mine' | 'all';

/** Home screen: the running list, ranked High → Medium → Low. */
export function TasksView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data, settings } = useStore();
  const ctx = useRowContext(data, onOpen);
  const [scope, setScope] = useState<Scope>(settings.meId ? 'mine' : 'all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const categories = activeCategories(data);
  const starterLeft = useMemo(() => planStarterImport(data).tasks.length, [data.tasks]);

  const needle = q.trim().toLowerCase();
  const tasks = liveTasks(data)
    .filter((t) => !t.parentId && t.status === 'open')
    .filter((t) => scope === 'all' || isMine(t, settings.meId))
    .filter((t) => !cat || t.categoryId === cat)
    .filter((t) => !needle || t.title.toLowerCase().includes(needle) || t.notes.toLowerCase().includes(needle))
    .sort(sortTasks);
  const filtered = !!(needle || cat);

  return (
    <div class="content">
      {settings.apiUrl && starterLeft === STARTER_TASKS.length && (
        <div class="banner" style={{ margin: '0 0 12px' }}>
          <span>Load Rob &amp; Rebecca's starting list ({STARTER_TASKS.length} tasks)?</span>
          <button class="btn primary" data-testid="import-starter" onClick={() => showToast(`Added ${importStarter()} tasks`)}>
            Load
          </button>
        </div>
      )}

      {settings.meId && <Seg label="Show" value={scope} onChange={setScope} options={[['mine', 'Mine'], ['all', 'Everyone']]} />}

      <div class="filters">
        <div class="filter-bar">
          <label class="search-wrap">
            <IconSearch />
            <input class="search" type="search" placeholder="Search" value={q} onInput={(e) => setQ(e.currentTarget.value)} aria-label="Search tasks" />
          </label>
          <select class={`pill ${cat ? 'on' : ''}`} value={cat} onChange={(e) => setCat(e.currentTarget.value)} aria-label="Category" data-testid="filter-category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {tasks.length || filtered ? (
        <RankedList tasks={tasks} ctx={ctx} />
      ) : (
        <Empty title={scope === 'mine' ? 'Nothing on your list' : 'Nothing on the list'}>Tap + to add something.</Empty>
      )}
    </div>
  );
}
