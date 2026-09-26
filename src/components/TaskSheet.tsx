import { useMemo, useState } from 'preact/hooks';
import type { Comment, Task } from '../api/types';
import { blankTask, uid } from '../lib/defaults';
import { parseQuickAdd } from '../lib/quickadd';
import { activeCategories, activeMembers, sortTasks } from '../store/selectors';
import { completeTask, deleteTask, remove, reopenTask, save, showToast, useStore } from '../store/store';
import { Avatar, Seg, Sheet } from './common';
import { IconCheck, IconClose, IconPlus, IconSend, IconTrash } from './icons';

export interface TaskSheetProps {
  task?: Task;
  /** Defaults for a new task. */
  defaults?: Partial<Task>;
  onClose: () => void;
}

export function TaskSheet({ task, defaults, onClose }: TaskSheetProps) {
  const { data, settings } = useStore();
  const isNew = !task;
  const members = activeMembers(data);
  const categories = activeCategories(data);

  const [draft, setDraft] = useState<Task>(
    () => task ?? blankTask({ assigneeId: settings.meId, createdBy: settings.meId, ...defaults }),
  );
  const [rawTitle, setRawTitle] = useState(draft.title);
  const set = (patch: Partial<Task>) => setDraft((d) => ({ ...d, ...patch }));

  const onTitle = (value: string) => {
    setRawTitle(value);
    if (!isNew) return set({ title: value });
    // Quick-add shorthand: "Fix gutter @Rob #Home !high"
    const p = parseQuickAdd(value, members, categories);
    set({
      title: p.title,
      ...(p.assigneeId && { assigneeId: p.assigneeId }),
      ...(p.categoryId && { categoryId: p.categoryId }),
      ...(p.priority && { priority: p.priority }),
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
    deleteTask(task);
    onClose();
  };

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
            placeholder={isNew ? 'What needs doing?' : 'Title'}
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
          {isNew && rawTitle !== draft.title && draft.title ? (
            <div class="hint">Will save as “{draft.title}”</div>
          ) : (
            isNew && <div class="hint">Tip: add @name, #category or !high</div>
          )}
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
              <IconCheck /> Mark done
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

      <div class="section-h" style={{ marginTop: 14 }}><h2>Details</h2></div>
      <div class="card">
        <div class="field">
          <span class="label">Priority</span>
          <Seg
            label="Priority"
            value={draft.priority}
            onChange={(v) => set({ priority: v })}
            options={[['high', 'High'], ['med', 'Medium'], ['low', 'Low']]}
          />
        </div>
        <label class="field">
          <span class="label">Category</span>
          <select value={draft.categoryId} onChange={(e) => set({ categoryId: e.currentTarget.value })}>
            <option value="">None</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
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

function Subtasks({ parent }: { parent: Task }) {
  const { data, settings } = useStore();
  const subs = data.tasks.filter((t) => t.parentId === parent.id && !t.deleted).sort(sortTasks);
  const [text, setText] = useState('');
  const add = () => {
    const title = text.trim();
    if (!title) return;
    save('tasks', blankTask({ title, parentId: parent.id, categoryId: parent.categoryId, assigneeId: parent.assigneeId, priority: parent.priority, createdBy: settings.meId }));
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
