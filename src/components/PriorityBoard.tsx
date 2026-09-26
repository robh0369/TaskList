import { useEffect, useRef, useState } from 'preact/hooks';
import type { Priority, Task } from '../api/types';
import { save, showToast } from '../store/store';
import { IconGrip } from './icons';
import { TaskRow, type RowContext } from './TaskRow';

const LANES: { p: Priority; label: string }[] = [
  { p: 'high', label: 'High' },
  { p: 'med', label: 'Medium' },
  { p: 'low', label: 'Low' },
];
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

function laneAt(x: number, y: number): Priority | null {
  const el = document.elementFromPoint(x, y)?.closest('[data-lane]') as HTMLElement | null;
  return (el?.dataset.lane as Priority) ?? null;
}

function setPriority(task: Task, p: Priority) {
  if (task.priority === p) return;
  const before = task;
  save('tasks', { ...task, priority: p });
  showToast(`Moved to ${LABEL[p]}`, () => save('tasks', before));
}

/**
 * Tasks grouped into High / Medium / Low lanes. Drag a task by its handle to
 * another lane to change its priority. Works with touch and mouse (pointer
 * events), and with the keyboard: focus a handle and press ↑ / ↓.
 */
export function PriorityBoard({ tasks, ctx }: { tasks: Task[]; ctx: RowContext }) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<Priority | null>(null);
  const pointerY = useRef(0);
  const raf = useRef(0);

  // Scroll the page while dragging near the top or bottom edge.
  useEffect(() => {
    if (!drag) return;
    const tick = () => {
      const y = pointerY.current;
      const edge = 90;
      const bottomEdge = window.innerHeight - 140; // tab bar + FAB
      if (y < edge) window.scrollBy(0, -Math.ceil((edge - y) / 6));
      else if (y > bottomEdge) window.scrollBy(0, Math.ceil((y - bottomEdge) / 6));
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
    setOver(laneAt(e.clientX, e.clientY));
  };

  const end = (e: PointerEvent) => {
    if (!drag) return;
    const lane = e.type === 'pointerup' ? laneAt(e.clientX, e.clientY) : null;
    if (lane) setPriority(drag.task, lane);
    setDrag(null);
    setOver(null);
  };

  const onKey = (e: KeyboardEvent, task: Task) => {
    const i = ORDER.indexOf(task.priority);
    if (e.key === 'ArrowUp' && i > 0) setPriority(task, ORDER[i - 1]);
    else if (e.key === 'ArrowDown' && i < ORDER.length - 1) setPriority(task, ORDER[i + 1]);
    else return;
    e.preventDefault();
  };

  return (
    <div class={`board ${drag ? 'is-dragging' : ''}`}>
      <p class="hint" style={{ margin: '0 4px 4px' }}>Drag a task by its ⠿ handle to change its priority.</p>
      {LANES.map(({ p, label }) => {
        const items = tasks.filter((t) => t.priority === p);
        return (
          <section key={p} class={`section lane lane-${p} ${over === p && drag ? 'lane-over' : ''}`} data-lane={p} data-testid={`lane-${p}`}>
            <div class="section-h">
              <h2 class={p === 'high' ? 'danger' : ''}>{label}</h2>
              <span class="count">{items.length}</span>
            </div>
            <div class="card lane-card">
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
                      aria-label={`Drag "${t.title}" to change priority (now ${LABEL[t.priority]}). Arrow keys also move it.`}
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
              {items.length === 0 && <div class="lane-empty">Drop tasks here</div>}
            </div>
          </section>
        );
      })}
      {drag && (
        <div class="drag-ghost" style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.width }} aria-hidden="true">
          {drag.task.title}
        </div>
      )}
    </div>
  );
}
