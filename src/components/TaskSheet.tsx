import { useMemo, useState } from 'preact/hooks';
import type { Comment, Recurrence, Task } from '../api/types';
import { addDays, parseISODate, today, weekdayName } from '../lib/dates';
import { blankTask, uid } from '../lib/defaults';
import { parseQuickAdd } from '../lib/quickadd';
import { describeRecurrence } from '../lib/recurrence';
import { activeCategories, activeMembers, activeProjects, sortTasks } from '../store/selectors';
import { completeTask, remove, reopenTask, save, showToast, useStore } from '../store/store';
import { Avatar, Seg, Sheet } from './common';
import { IconCheck, IconClose, IconPlus, IconSend, IconTrash } from './icons';

export interface TaskSheetProps {
  task?: Task;
  /** Defaults for a new task (e.g. projectId when adding from a project). */
  defaults?: Partial<Task>;
  onClose: () => void;
}

type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly';

export function TaskSheet({ task, defaults, onClose }: TaskSheetProps) {
  const { data, settings } = useStore();
  const isNew = !task;
  const members = activeMembers(data);
  const categories = activeCategories(data);
  const projects = activeProjects(data).filter((p) => p.status === 'active' || p.id === task?.projectId);

  const [draft, setDraft] = useState<Task>(
    () => task ?? blankTask({ assigneeId: settings.meId, createdBy: settings.meId, ...defaults }),
  );
  const [rawTitle, setRawTitle] = useState(draft.title);
  const set = (patch: Partial<Task>) => setDraft((d) => ({ ...d, ...patch }));

  const onTitle = (value: string) => {
    setRawTitle(value);
    if (!isNew) return set({ title: value });
    // Quick-add shorthand: "Mow lawn fri @Sam #Yard every 2 weeks"
    const p = parseQuickAdd(value, members, categories);
    set({
      title: p.title,
      ...(p.dueDate && { dueDate: p.dueDate }),
      ...(p.assigneeId && { assigneeId: p.assigneeId }),
      ...(p.categoryId && { categoryId: p.categoryId }),
      ...(p.priority !== 'med' && { priority: p.priority }),
      ...(p.recurrence && { recurrence: p.recurrence }),
    });
  };

  const commit = () => {
    const title = (isNew ? draft.title : rawTitle).trim();
    if (!title) return;
    save('tasks', { ...draft, title, status: draft.status });
    if (isNew) showToast('Task added');
    onClose();
  };

  const del = () => {
    if (!task) return;
    const subs = data.tasks.filter((t) => t.parentId === task.id && !t.deleted);
    remove('tasks', task);
    subs.forEach((s) => remove('tasks', s));
    showToast('Task deleted', () => {
      save('tasks', task);
      subs.forEach((s) => save('tasks', s));
    });
    onClose();
  };

  const repeatKind: RepeatKind = draft.recurrence?.freq ?? 'none';
  const setRepeat = (kind: RepeatKind) => {
    if (kind === 'none') return set({ recurrence: null });
    const r: Recurrence = { freq: kind, interval: draft.recurrence?.interval ?? 1, mode: draft.recurrence?.mode ?? 'fixed' };
    if (kind === 'weekly' && draft.dueDate) r.byWeekday = [parseISODate(draft.dueDate).getDay()];
    if (kind === 'monthly' && draft.dueDate) r.byMonthDay = parseISODate(draft.dueDate).getDate();
    set({ recurrence: r, dueDate: draft.dueDate || today() });
  };
  const setRule = (patch: Partial<Recurrence>) => draft.recurrence && set({ recurrence: { ...draft.recurrence, ...patch } });

  const t0 = today();
  const quickDates: [string, string][] = [
    [t0, 'Today'],
    [addDays(t0, 1), 'Tomorrow'],
    [addDays(t0, 7), 'Next week'],
  ];

  return (
    <Sheet
      title={isNew ? 'New task' : 'Task'}
      onClose={onClose}
      actions={
        <button class="btn ghost" onClick={commit} disabled={!rawTitle.trim()} data-testid="save-task">
          {isNew ? 'Add' : 'Save'}
        </button>
      }
    >
      <div class="card">
        <div class="field">
          <textarea
            class="title-input"
            rows={1}
            placeholder={isNew ? 'e.g. Mow lawn sat @Sam #Yard every 2 weeks' : 'Title'}
            value={rawTitle}
            onInput={(e) => onTitle(e.currentTarget.value.replace(/\n/g, ' '))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commit();
              }
            }}
            autoFocus={isNew}
            aria-label="Title"
            data-testid="task-title"
          />
          {isNew && rawTitle !== draft.title && draft.title && <div class="hint">Will save as “{draft.title}”</div>}
        </div>
        <label class="field">
          <span class="label">Notes</span>
          <textarea rows={2} value={draft.notes} onInput={(e) => set({ notes: e.currentTarget.value })} placeholder="Details, links, sizes…" />
        </label>
      </div>

      {!isNew && task && (
        <div style={{ margin: '12px 0' }}>
          {task.status === 'done' ? (
            <button class="btn block" onClick={() => { reopenTask(task); onClose(); }}>Mark not done</button>
          ) : (
            <button class="btn primary block" onClick={() => { completeTask(task); onClose(); }} data-testid="complete-in-sheet">
              <IconCheck /> {task.recurrence ? 'Done for this time' : 'Mark done'}
            </button>
          )}
        </div>
      )}

      <div class="section-h" style={{ marginTop: 16 }}><h2>Who</h2></div>
      <div class="chips" style={{ padding: '2px 0 6px', margin: 0, flexWrap: 'wrap' }}>
        {members.map((m) => (
          <button key={m.id} class="chip" aria-pressed={draft.assigneeId === m.id} onClick={() => set({ assigneeId: m.id })}>
            <Avatar member={m} size="sm" /> {m.name}
          </button>
        ))}
        <button class="chip" aria-pressed={draft.assigneeId === 'both'} onClick={() => set({ assigneeId: 'both' })}>Both</button>
        <button class="chip" aria-pressed={draft.assigneeId === ''} onClick={() => set({ assigneeId: '' })}>Anyone</button>
      </div>

      <div class="section-h" style={{ marginTop: 14 }}><h2>When</h2></div>
      <div class="card">
        <div class="field">
          <div class="chips" style={{ padding: 0, margin: '0 0 8px', flexWrap: 'wrap' }}>
            {quickDates.map(([d, label]) => (
              <button key={label} class="chip" aria-pressed={draft.dueDate === d} onClick={() => set({ dueDate: d })}>{label}</button>
            ))}
            <button class="chip" aria-pressed={!draft.dueDate} onClick={() => set({ dueDate: '', recurrence: null })}>No date</button>
          </div>
          <input type="date" value={draft.dueDate} onInput={(e) => set({ dueDate: e.currentTarget.value })} aria-label="Due date" />
        </div>
        <div class="field">
          <span class="label">Repeat</span>
          <Seg
            label="Repeat"
            value={repeatKind}
            onChange={setRepeat}
            options={[['none', 'Never'], ['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']]}
          />
          {draft.recurrence && (
            <RepeatDetails rule={draft.recurrence} onChange={setRule} />
          )}
        </div>
      </div>

      <div class="section-h" style={{ marginTop: 14 }}><h2>Details</h2></div>
      <div class="card">
        <div class="row">
          <label class="field">
            <span class="label">Category</span>
            <select value={draft.categoryId} onChange={(e) => set({ categoryId: e.currentTarget.value })}>
              <option value="">None</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label class="field">
            <span class="label">Project</span>
            <select value={draft.projectId} onChange={(e) => set({ projectId: e.currentTarget.value })} disabled={!!draft.parentId}>
              <option value="">None</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        </div>
        <div class="field">
          <span class="label">Priority</span>
          <Seg label="Priority" value={draft.priority} onChange={(v) => set({ priority: v })} options={[['low', 'Low'], ['med', 'Medium'], ['high', 'High']]} />
        </div>
        <div class="field">
          <span class="label">Effort</span>
          <Seg
            label="Effort"
            value={draft.effort}
            onChange={(v) => set({ effort: v })}
            options={[[1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']]}
          />
          <div class="hint">1 = a few minutes · 5 = most of a day. Used for the workload report.</div>
        </div>
      </div>

      {!isNew && task && !task.parentId && <Subtasks parent={task} />}
      {!isNew && task && <Comments task={task} />}

      {!isNew && (
        <button class="btn danger block" style={{ marginTop: 20 }} onClick={del}>
          <IconTrash /> Delete task
        </button>
      )}
    </Sheet>
  );
}

function RepeatDetails({ rule, onChange }: { rule: Recurrence; onChange: (p: Partial<Recurrence>) => void }) {
  const unit = rule.freq === 'daily' ? 'day' : rule.freq === 'weekly' ? 'week' : 'month';
  return (
    <div style={{ marginTop: 10 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
        Every
        <input
          type="number"
          min={1}
          max={99}
          value={rule.interval}
          onInput={(e) => onChange({ interval: Math.max(1, Number(e.currentTarget.value) || 1) })}
          style={{ width: 56, background: 'var(--surface-2)', borderRadius: 8, textAlign: 'center', padding: '4px' }}
          aria-label="Interval"
        />
        {unit}{rule.interval > 1 ? 's' : ''}
      </label>
      {rule.freq === 'weekly' && (
        <div class="weekday-pick" role="group" aria-label="Days of week">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const on = rule.byWeekday?.includes(d) ?? false;
            return (
              <button
                key={d}
                aria-pressed={on}
                aria-label={weekdayName(d)}
                onClick={() => {
                  const cur = rule.byWeekday ?? [];
                  onChange({ byWeekday: on ? cur.filter((x) => x !== d) : [...cur, d].sort() });
                }}
              >
                {weekdayName(d)[0]}
              </button>
            );
          })}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <Seg
          label="Repeat from"
          value={rule.mode}
          onChange={(mode) => onChange({ mode })}
          options={[['fixed', 'On schedule'], ['afterCompletion', 'After done']]}
        />
      </div>
      <div class="hint">
        {describeRecurrence(rule)}.{' '}
        {rule.mode === 'fixed' ? 'Keeps its calendar rhythm even if done late.' : 'Next one is counted from the day it gets done.'}
      </div>
    </div>
  );
}

function Subtasks({ parent }: { parent: Task }) {
  const { data, settings } = useStore();
  const subs = data.tasks.filter((t) => t.parentId === parent.id && !t.deleted).sort(sortTasks);
  const [text, setText] = useState('');
  const add = () => {
    const title = text.trim();
    if (!title) return;
    save('tasks', blankTask({ title, parentId: parent.id, projectId: parent.projectId, categoryId: parent.categoryId, assigneeId: parent.assigneeId, createdBy: settings.meId, effort: 1 }));
    setText('');
  };
  return (
    <>
      <div class="section-h" style={{ marginTop: 14 }}>
        <h2>Subtasks</h2>
        {subs.length > 0 && <span class="count">{subs.filter((s) => s.status === 'done').length}/{subs.length}</span>}
      </div>
      <div class="card">
        {subs.map((s) => (
          <div key={s.id} class={`task ${s.status === 'done' ? 'is-done' : ''}`} style={{ minHeight: 48, padding: '10px 14px' }}>
            <button
              class={`check ${s.status === 'done' ? 'done' : ''}`}
              onClick={() => (s.status === 'done' ? reopenTask(s) : completeTask(s))}
              aria-label={`Toggle ${s.title}`}
            >
              <IconCheck />
            </button>
            <div class="task-body"><div class="task-title">{s.title}</div></div>
            <button class="icon-btn" style={{ width: 32, height: 32 }} aria-label={`Remove ${s.title}`} onClick={() => remove('tasks', s)}>
              <IconClose />
            </button>
          </div>
        ))}
        <div class="composer" style={subs.length ? {} : { borderTop: 0 }}>
          <input
            value={text}
            onInput={(e) => setText(e.currentTarget.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Add a step"
            aria-label="New subtask"
            style={{ flex: 1, border: 0, background: 'none', outline: 'none', fontSize: 16, minHeight: 36 }}
          />
          <button class="icon-btn" onClick={add} aria-label="Add subtask" disabled={!text.trim()}><IconPlus /></button>
        </div>
      </div>
    </>
  );
}

function Comments({ task }: { task: Task }) {
  const { data, settings } = useStore();
  const members = activeMembers(data);
  const comments = useMemo(
    () => data.comments.filter((c) => c.taskId === task.id && !c.deleted).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [data.comments, task.id],
  );
  const [text, setText] = useState('');

  const post = () => {
    const body = text.trim();
    if (!body) return;
    const now = new Date().toISOString();
    const c: Comment = { id: uid('k'), taskId: task.id, authorId: settings.meId, body, photoFileId: '', createdAt: now, updatedAt: now, deleted: false };
    save('comments', c);
    setText('');
  };

  return (
    <>
      <div class="section-h" style={{ marginTop: 14 }}><h2>Comments</h2></div>
      <div class="card">
        {comments.map((c) => {
          const author = members.find((m) => m.id === c.authorId);
          return (
            <div class="comment" key={c.id}>
              <Avatar member={author} size="sm" />
              <div class="comment-body">
                <div class="comment-meta">
                  <b>{author?.name ?? 'Someone'}</b> · {new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </div>
                {c.body && <p>{c.body}</p>}
              </div>
              {c.authorId === settings.meId && (
                <button class="icon-btn" style={{ width: 32, height: 32 }} aria-label="Delete comment" onClick={() => remove('comments', c)}>
                  <IconClose />
                </button>
              )}
            </div>
          );
        })}
        <div class="composer" style={comments.length ? {} : { borderTop: 0 }}>
          <textarea rows={1} value={text} placeholder="Add a comment" onInput={(e) => setText(e.currentTarget.value)} aria-label="Comment" />
          <button class="icon-btn" aria-label="Post comment" onClick={post} disabled={!text.trim()}><IconSend /></button>
        </div>
      </div>
    </>
  );
}
