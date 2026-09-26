import { useEffect, useRef, useState } from 'preact/hooks';
import type { Priority, Task } from '../api/types';
import { deleteTask, save, showToast } from '../store/store';
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

/** Where a drop would land: a priority lane, the trash zone, or nowhere. */
type Target = Priority | 'trash';

function targetAt(x: number, y: number): Target | null {
  const el = document.elementFromPoint(x, y)?.closest('[data-lane]') as HTMLElement | null;
  return (el?.dataset.lane as Target) ?? null;
}

const TRASH_HEIGHT = 112;

function setPriority(task: Task, p: Priority) {
  if (task.priority === p) return;
  const before = task;
  save('tasks', { ...task, priority: p });
  showToast(`Moved to ${LABEL[p]}`, () => save('tasks', before));
}

/**
 * One continuous list ranked High → Medium → Low, with a thin divider per
 * level. Drag a task by its handle past a divider to change its priority.
 * Works with touch and mouse (pointer events), and with the keyboard:
 * focus a handle and press ↑ / ↓.
 */
export function RankedList({ tasks, ctx }: { tasks: Task[]; ctx: RowContext }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<Target | null>(null);
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
    setOver(task.priority);
    navigator.vibrate?.(10);
  };

  const move = (e: PointerEvent) => {
    if (!drag) return;
    pointerY.current = e.clientY;
    setDrag({ ...drag, x: e.clientX, y: e.clientY });
    setOver(targetAt(e.clientX, e.clientY));
  };

  const end = (e: PointerEvent) => {
    if (!drag) return;
    const target = e.type === 'pointerup' ? targetAt(e.clientX, e.clientY) : null;
    if (target === 'trash') deleteTask(drag.task);
    else if (target) setPriority(drag.task, target);
    setDrag(null);
    setOver(null);
  };

  const onKey = (e: KeyboardEvent, task: Task) => {
    const i = ORDER.indexOf(task.priority);
    if (e.key === 'ArrowUp' && i > 0) setPriority(task, ORDER[i - 1]);
    else if (e.key === 'ArrowDown' && i < ORDER.length - 1) setPriority(task, ORDER[i + 1]);
    else if (e.key === 'Delete') deleteTask(task);
    else return;
    e.preventDefault();
  };

  return (
    <div class={`ranked ${drag ? 'is-dragging' : ''}`}>
      <div class="ranked-card">
        {ORDER.map((p) => {
          const items = tasks.filter((t) => t.priority === p);
          return (
            <div key={p} class={`rank-group rank-${p} ${over === p && drag ? 'lane-over' : ''}`} data-lane={p} data-testid={`lane-${p}`}>
              <div class="rank-divider">
                <span class="rank-swatch" aria-hidden="true" />
                <span class="rank-label">{LABEL[p]}</span>
                <span class="rank-count">{items.length}</span>
              </div>
              {items.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  ctx={ctx}
                  hidePriority
                  class={drag?.task.id === t.id ? 'is-drag-source' : ''}
                  trailing={
                    <button
                      class="drag-handle"
                      aria-label={`Drag "${t.title}" to change priority (now ${LABEL[t.priority]}) or to the trash to delete. Arrow keys also move it.`}
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
                />
              ))}
              {items.length === 0 && <div class="rank-empty">No {LABEL[p].toLowerCase()} priority tasks</div>}
            </div>
          );
        })}
      </div>
      <p class="hint ranked-hint">Drag the handle on a task to change its priority, or onto the trash to delete it.</p>
      {drag && (
        <div class={`trash-zone ${over === 'trash' ? 'is-over' : ''}`} data-lane="trash" data-testid="trash-zone" style={{ height: TRASH_HEIGHT }}>
          <IconTrash />
          <span>{over === 'trash' ? 'Release to delete' : 'Drag here to delete'}</span>
        </div>
      )}
      {drag && (
        <div class={`drag-ghost prio-${over && over !== 'trash' ? over : drag.task.priority} ${over === 'trash' ? 'to-trash' : ''}`} style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width }} aria-hidden="true">
          {drag.task.title}
        </div>
      )}
    </div>
  );
}
