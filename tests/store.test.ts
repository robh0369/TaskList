import { beforeEach, describe, expect, it } from 'vitest';
import { DemoBackend } from '../src/api/mock';
import { blankTask } from '../src/lib/defaults';
import { __resetForTests, completeTask, getState, save, syncNow } from '../src/store/store';

beforeEach(() => {
  localStorage.clear();
  DemoBackend.reset();
  __resetForTests({ meId: 'm1' });
});

describe('store + demo backend', () => {
  it('initial sync loads seed data', async () => {
    await syncNow();
    const s = getState();
    expect(s.sync.status).toBe('idle');
    expect(s.data.members.length).toBe(2);
    expect(s.data.tasks.length).toBeGreaterThan(3);
    expect(s.rev).toBeGreaterThan(0);
  });

  it('local edits apply immediately, queue, then flush', async () => {
    await syncNow();
    const t = save('tasks', blankTask({ title: 'Fix faucet' }));
    expect(getState().data.tasks.some((x) => x.id === t.id)).toBe(true);
    expect(getState().outbox.length).toBe(1);
    await syncNow();
    expect(getState().outbox.length).toBe(0);
    // A second device starting fresh sees it.
    const pulled = await new DemoBackend().pull(0);
    expect(pulled.changes.tasks!.some((x) => x.id === t.id)).toBe(true);
  });

  it('completing a recurring task logs a completion and rolls the due date', async () => {
    await syncNow();
    const t = save('tasks', blankTask({ title: 'Trash', dueDate: '2026-09-22', recurrence: { freq: 'weekly', interval: 1, mode: 'fixed' } }));
    completeTask(t);
    const after = getState().data.tasks.find((x) => x.id === t.id)!;
    expect(after.status).toBe('open');
    expect(after.dueDate > t.dueDate).toBe(true);
    const log = getState().data.completions.filter((c) => c.taskId === t.id);
    expect(log).toHaveLength(1);
    expect(log[0].completedBy).toBe('m1');
  });

  it('undo restores the task and removes the completion', async () => {
    await syncNow();
    const t = save('tasks', blankTask({ title: 'Once' }));
    const undo = completeTask(t);
    expect(getState().data.tasks.find((x) => x.id === t.id)!.status).toBe('done');
    undo();
    expect(getState().data.tasks.find((x) => x.id === t.id)!.status).toBe('open');
    expect(getState().data.completions.filter((c) => c.taskId === t.id && !c.deleted)).toHaveLength(0);
  });

  it('a newer local pending edit is not clobbered by an older server row', async () => {
    await syncNow();
    const t = save('tasks', blankTask({ title: 'v1' }));
    await syncNow();
    // Another device writes an older version directly to the backend.
    await new DemoBackend().push([{ opId: 'x', collection: 'tasks', record: { ...t, title: 'stale', updatedAt: '2001-01-01T00:00:00Z' } }]);
    save('tasks', { ...t, title: 'v2' });
    await syncNow();
    expect(getState().data.tasks.find((x) => x.id === t.id)!.title).toBe('v2');
  });
});
