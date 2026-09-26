import { useEffect, useRef, useState } from 'preact/hooks';
import type { Priority, Task } from '../api/types';
import { deleteTask, moveTask } from '../store/store';
import { IconGrip, IconTrash } from './icons';
import { TaskRow, type RowContext } from './TaskRow';

const ORDER: Priority[] = ['high', 'med', 'low'];
const LABEL: Record<Priority, string> = { high: 'High', med: 'Medium', low: 'Low' };

interface Drag {
  task: Task;
  x: number;
  y: number;
  /** Offset from the pointer to the row's top-left, so the ghost doesn't jump. */
  dx: number;
  dy: number;
  width: number;
}

/**
 * Where a drop would land: the trash, or a slot in a priority section —
 * just before `beforeId`, or after `afterId` (the last visible task), or into
 * an empty section.
 */
type Target = { kind: 'trash' } | { kind: 'lane'; lane: Priority; beforeId: string | null; afterId: string | null };

function targetAt(x: number, y: number, draggingId: string): Target | null {
  const el = document.elementFromPoint(x, y)?.closest('[data-lane]') as HTMLElement | null;
  const lane = el?.dataset.lane;
  if (!el || !lane) return null;
  if (lane === 'trash') return { kind: 'trash' };
  // The first row whose middle is below the pointer is the one we'd drop in front of.
  const rows = [...el.querySelectorAll<HTMLElement>('.task[data-task-id]')].filter((r) => r.dataset.taskId !== draggingId);
  const before = rows.find((r) => {
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2 > y;
  });
  return {
    kind: 'lane',
    lane: lane as Priority,
    beforeId: before?.dataset.taskId ?? null,
    afterId: before ? null : (rows[rows.length - 1]?.dataset.taskId ?? null),
  };
}

const TRASH_HEIGHT = 112;
/** The floating copy sits just above the finger so the insertion line under it stays visible. */
const GHOST_LIFT = 64;

/**
 * One continuous list ranked High → Medium → Low, with a thin divider per
 * level. Drag a task by its handle to reorder it within its section, past a
 * divider to change its priority, or onto the trash to delete it. Works with
 * touch and mouse (pointer events), and with the keyboard: focus a handle and
 * press ↑ / ↓ to move it one place (crossing into the next section at the
 * edges), or Delete.
 */
export function RankedList({ tasks, ctx }: { tasks: Task[]; ctx: RowContext }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<Target | null>(null);
  const overLane = over?.kind === 'lane' ? over.lane : null;
  const pointerY = useRef(0);
  const raf = useRef(0);

  // Scroll the page while dragging near the top or bottom edge.
  useEffect(() => {
    if (!drag) return;
    const tick = () => {
      const y = pointerY.current;
      const edge = 90;
      const trashTop = window.innerHeight - TRASH_HEIGHT;
      const bottomEdge = trashTop - 80;
      if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 6));
      // Scroll down in the band just above the trash zone, but hold still over the trash.
      else if (y > bottomEdge && y < trashTop) window.scrollBy(0, Math.ceil((y - bottomEdge) / 6));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [!!drag]);

  const start = (e: PointerEvent, task: Task) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    const row = handle.closest('.task') as HTMLElement;
    const r = row.getBoundingClientRect();
    pointerY.current = e.clientY;
    setDrag({ task, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, width: r.width });
    setOver(null);
    navigator.vibrate?.(10);
  };

  const move = (e: PointerEvent) => {
    if (!drag) return;
    pointerY.current = e.clientY;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setOver(targetAt(e.clientX, e.clientY, drag.task.id));
  };

  const end = (e: PointerEvent) => {
    if (!drag) return;
    const target = e.type === 'pointerup' ? targetAt(e.clientX, e.clientY, drag.task.id) : null;
    if (target?.kind === 'trash') deleteTask(drag.task);
    else if (target) moveTask(drag.task, target.lane, target.beforeId, target.afterId);
    setDrag(null);
    setOver(null);
  };

  const laneItems = (p: Priority) => tasks.filter((t) => t.priority === p);

  const onKey = (e: KeyboardEvent, task: Task) => {
    const items = laneItems(task.priority);
    const idx = items.findIndex((t) => t.id === task.id);
    const li = ORDER.indexOf(task.priority);
    if (e.key === 'ArrowUp') {
      if (idx > 0) moveTask(task, task.priority, items[idx - 1].id, null);
      else if (li > 0) {
        const up = laneItems(ORDER[li - 1]);
        moveTask(task, ORDER[li - 1], null, up[up.length - 1]?.id ?? null);
      } else return;
    } else if (e.key === 'ArrowDown') {
      if (idx < items.length - 1) moveTask(task, task.priority, items[idx + 2]?.id ?? null, items[idx + 1].id);
      else if (li < ORDER.length - 1) moveTask(task, ORDER[li + 1], laneItems(ORDER[li + 1])[0]?.id ?? null, null);
      else return;
    } else if (e.key === 'Delete') deleteTask(task);
    else return;
    e.preventDefault();
  };

  /** Show the insertion line only where a drop would actually change something. */
  const dropLineBefore = (p: Priority, id: string | null): boolean => {
    if (!drag || over?.kind !== 'lane' || over.lane !== p) return false;
    const items = laneItems(p);
    const self = items.findIndex((t) => t.id === drag.task.id);
    if (id === null) {
      // End of the section.
      if (over.beforeId !== null) return false;
      return !(self !== -1 && self === items.length - 1);
    }
    if (over.beforeId !== id) return false;
    // Dropping just in front of the task right after itself is a no-op.
    return !(self !== -1 && items[self + 1]?.id === id);
  };

  return (
    <div class={`ranked ${drag ? 'is-dragging' : ''}`}>
      <div class="ranked-card">
        {ORDER.map((p) => {
          const items = laneItems(p);
          return (
            <div key={p} class={`rank-group rank-${p} ${overLane === p && drag && overLane !== drag.task.priority ? 'lane-over' : ''}`} data-lane={p} data-testid={`lane-${p}`}>
              <div class="rank-divider">
                <span class="rank-swatch" aria-hidden="true" />
                <span class="rank-label">{LABEL[p]}</span>
                <span class="rank-count">{items.length}</span>
              </div>
              {items.map((t) => [
                dropLineBefore(p, t.id) && <div key={`line-${t.id}`} class="drop-line" data-testid="drop-line" aria-hidden="true" />,
                <TaskRow
                  key={t.id}
                  task={t}
                  ctx={ctx}
                  hidePriority
                  class={drag?.task.id === t.id ? 'is-drag-source' : ''}
                  trailing={
                    <button
                      class="drag-handle"
                      aria-label={`Drag "${t.title}" to reorder or change priority (now ${LABEL[t.priority]}), or to the trash to delete. Arrow keys also move it.`}
                      data-testid="drag-handle"
                      onPointerDown={(e) => start(e, t)}
                      onPointerMove={move}
                      onPointerUp={end}
                      onPointerCancel={end}
                      onKeyDown={(e) => onKey(e, t)}
                    >
                      <IconGrip />
                    </button>
                  }
                />,
              ])}
              {dropLineBefore(p, null) && <div class="drop-line" data-testid="drop-line" aria-hidden="true" />}
              {items.length === 0 && <div class="rank-empty">No {LABEL[p].toLowerCase()} priority tasks</div>}
            </div>
          );
        })}
      </div>
      <p class="hint ranked-hint">Drag the handle on a task to reorder it, move it to another priority, or onto the trash to delete it.</p>
      {drag && (
        <div class={`trash-zone ${over?.kind === 'trash' ? 'is-over' : ''}`} data-lane="trash" data-testid="trash-zone" style={{ height: TRASH_HEIGHT }}>
          <IconTrash />
          <span>{over?.kind === 'trash' ? 'Release to delete' : 'Drag here to delete'}</span>
        </div>
      )}
      {drag && (
        <div class={`drag-ghost prio-${overLane ?? drag.task.priority} ${over?.kind === 'trash' ? 'to-trash' : ''}`} style={{ left: drag.x - drag.dx, top: drag.y - GHOST_LIFT, width: drag.width }} aria-hidden="true">
          {drag.task.title}
        </div>
      )}
    </div>
  );
}
