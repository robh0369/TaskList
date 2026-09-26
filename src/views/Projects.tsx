import { useState } from 'preact/hooks';
import type { Project, Task } from '../api/types';
import { AssigneeAvatar, Empty, Seg, Sheet } from '../components/common';
import { IconPlus, IconTrash } from '../components/icons';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { daysBetween, relativeLabel, shortDate, today } from '../lib/dates';
import { blankProject, PROJECT_COLORS } from '../lib/defaults';
import { activeMembers, activeProjects, projectProgress, sortTasks } from '../store/selectors';
import { remove, save, showToast, useStore } from '../store/store';

export function ProgressRing({ pct, color, size = 48 }: { pct: number; color: string; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <svg class="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${Math.round(pct * 100)}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" stroke-width="5" />
      {pct > 0 && <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        stroke-width="5"
        stroke-linecap="round"
        stroke-dasharray={`${c * pct} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />}
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central">{Math.round(pct * 100)}%</text>
    </svg>
  );
}

export function ProjectsView({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const { data } = useStore();
  const [show, setShow] = useState<'active' | 'done'>('active');
  const [editing, setEditing] = useState<Project | null>(null);
  const projects = activeProjects(data)
    .filter((p) => p.status === show)
    .sort((a, b) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999'));
  const members = activeMembers(data);

  return (
    <div class="content">
      <Seg label="Show" value={show} onChange={setShow} options={[['active', 'Active'], ['done', 'Finished']]} />
      <section class="section">
        {projects.length ? (
          <div class="card">
            {projects.map((p) => {
              const prog = projectProgress(data, p.id);
              return (
                <button key={p.id} class="project-card" onClick={() => onOpenProject(p.id)} data-testid="project-card">
                  <ProgressRing pct={prog.pct} color={p.color} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{p.name}</h3>
                    <p>
                      {prog.done}/{prog.total} tasks
                      {p.targetDate && ` · target ${shortDate(p.targetDate)}`}
                      {p.targetDate && p.status === 'active' && p.targetDate < today() && ' (past due)'}
                    </p>
                  </div>
                  {p.ownerId && <AssigneeAvatar assigneeId={p.ownerId} members={members} />}
                </button>
              );
            })}
          </div>
        ) : (
          <Empty icon="🗂️" title={show === 'active' ? 'No active projects' : 'No finished projects yet'}>
            {show === 'active' && 'Group bigger jobs like “Repaint guest room” into steps.'}
          </Empty>
        )}
      </section>
      {show === 'active' && (
        <button class="btn block" style={{ marginTop: 16 }} onClick={() => setEditing(blankProject())} data-testid="new-project">
          <IconPlus /> New project
        </button>
      )}
      {editing && <ProjectSheet project={editing} isNew onClose={() => setEditing(null)} onCreated={onOpenProject} />}
    </div>
  );
}

export function ProjectSheet({ project, isNew, onClose, onCreated }: { project: Project; isNew?: boolean; onClose: () => void; onCreated?: (id: string) => void }) {
  const { data } = useStore();
  const members = activeMembers(data);
  const [draft, setDraft] = useState(project);
  const set = (p: Partial<Project>) => setDraft((d) => ({ ...d, ...p }));
  const commit = () => {
    if (!draft.name.trim()) return;
    save('projects', { ...draft, name: draft.name.trim() });
    onClose();
    if (isNew) onCreated?.(draft.id);
  };
  return (
    <Sheet
      title={isNew ? 'New project' : 'Edit project'}
      onClose={onClose}
      actions={<button class="btn ghost" onClick={commit} disabled={!draft.name.trim()} data-testid="save-project">{isNew ? 'Create' : 'Save'}</button>}
    >
      <div class="card">
        <div class="field">
          <input class="title-input" placeholder="Project name" value={draft.name} onInput={(e) => set({ name: e.currentTarget.value })} autoFocus={isNew} aria-label="Project name" data-testid="project-name" />
        </div>
        <label class="field">
          <span class="label">Description</span>
          <textarea rows={2} value={draft.description} onInput={(e) => set({ description: e.currentTarget.value })} />
        </label>
        <div class="row">
          <label class="field">
            <span class="label">Lead</span>
            <select value={draft.ownerId} onChange={(e) => set({ ownerId: e.currentTarget.value })}>
              <option value="">Both of us</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label class="field">
            <span class="label">Target date</span>
            <input type="date" value={draft.targetDate} onInput={(e) => set({ targetDate: e.currentTarget.value })} />
          </label>
        </div>
        <div class="field">
          <span class="label">Color</span>
          <div class="swatches" style={{ marginTop: 6 }}>
            {PROJECT_COLORS.map((c) => (
              <button key={c} class="swatch" style={{ background: c }} aria-pressed={draft.color === c} aria-label={`Color ${c}`} onClick={() => set({ color: c })} />
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export function ProjectDetail({ id, onOpen, onAdd, onBack }: { id: string; onOpen: (t: Task) => void; onAdd: (defaults: Partial<Task>) => void; onBack: () => void }) {
  const { data } = useStore();
  const ctx = useRowContext(data, onOpen);
  const [editing, setEditing] = useState(false);
  const project = data.projects.find((p) => p.id === id && !p.deleted);
  if (!project) {
    return (
      <div class="content">
        <Empty icon="🗂️" title="Project not found" />
      </div>
    );
  }
  const tasks = data.tasks.filter((t) => t.projectId === id && !t.deleted && !t.parentId).sort(sortTasks);
  const prog = projectProgress(data, id);
  const open = tasks.filter((t) => t.status === 'open');
  const done = tasks.filter((t) => t.status === 'done');
  const daysLeft = project.targetDate ? daysBetween(today(), project.targetDate) : null;

  const finish = () => {
    save('projects', { ...project, status: project.status === 'done' ? 'active' : 'done' });
    showToast(project.status === 'done' ? 'Project reopened' : 'Project finished 🎉');
  };
  const del = () => {
    remove('projects', project);
    showToast('Project deleted', () => save('projects', project));
    onBack();
  };

  return (
    <div class="content">
      <div class="card card-pad">
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <ProgressRing pct={prog.pct} color={project.color} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, color: 'var(--text-2)' }}>
              {prog.done} of {prog.total} done
            </div>
            {project.targetDate && (
              <div style={{ fontSize: 14, color: daysLeft! < 0 ? 'var(--danger)' : 'var(--text-3)' }}>
                Target {shortDate(project.targetDate)} · {daysLeft! >= 0 ? `${daysLeft} days left` : relativeLabel(project.targetDate)}
              </div>
            )}
          </div>
          <button class="btn ghost" onClick={() => setEditing(true)}>Edit</button>
        </div>
        {project.description && <p style={{ margin: '12px 0 0', color: 'var(--text-2)' }}>{project.description}</p>}
      </div>

      <section class="section">
        <div class="section-h"><h2>To do</h2><span class="count">{open.length}</span></div>
        <div class="card">
          {open.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} hideProject />)}
          <button class="btn ghost block" style={{ justifyContent: 'flex-start', padding: '14px 16px' }} onClick={() => onAdd({ projectId: id })} data-testid="add-project-task">
            <IconPlus /> Add task
          </button>
        </div>
      </section>

      {done.length > 0 && (
        <section class="section">
          <div class="section-h"><h2>Done</h2><span class="count">{done.length}</span></div>
          <div class="card">{done.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} hideProject />)}</div>
        </section>
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
        <button class="btn block" onClick={finish}>{project.status === 'done' ? 'Reopen project' : 'Mark project finished'}</button>
        <button class="btn danger block" onClick={del}><IconTrash /> Delete project</button>
      </div>
      {editing && <ProjectSheet project={project} onClose={() => setEditing(false)} />}
    </div>
  );
}
