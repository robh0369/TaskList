import { useState } from 'preact/hooks';
import { shortDate } from '../../lib/dates';
import type { WeekPoint } from '../../lib/reports';

/** Rounded data-end, square at the baseline. */
function column(x: number, w: number, top: number, base: number): string {
  const h = Math.max(0, base - top);
  if (h <= 0) return '';
  const r = Math.min(3, h, w / 2);
  return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${base} Z`;
}

/** Weekly grouped columns: tasks added (muted) next to tasks done (accent), with a hover/tap tooltip. */
export function WeeklyColumns({ weeks }: { weeks: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const padL = 24;
  const padB = 22;
  const padT = 16;
  const plotW = W - padL;
  const plotH = H - padB - padT;
  const max = Math.max(4, ...weeks.flatMap((w) => [w.count, w.added]));
  const step = max <= 5 ? 1 : max <= 12 ? 2 : Math.ceil(max / 5);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const band = plotW / weeks.length;
  const bw = Math.min(12, (band * 0.62 - 2) / 2);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const last = weeks.length - 1;

  return (
    <div class="chart" onMouseLeave={() => setHover(null)}>
      <div class="legend">
        <span><i style={{ background: 'var(--chart-muted)' }} /> Added</span>
        <span><i style={{ background: 'var(--seq)' }} /> Done</span>
      </div>
      <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tasks added and done per week">
        <g class="grid">
          {ticks.map((t) => <line key={t} x1={padL} x2={W} y1={y(t)} y2={y(t)} />)}
        </g>
        <g class="axis">
          {ticks.map((t) => <text key={t} x={padL - 6} y={y(t)} text-anchor="end" dominant-baseline="central">{t}</text>)}
          {weeks.map((w, i) =>
            i % (weeks.length > 8 ? 2 : 1) === 0 || i === last ? (
              <text key={w.weekStart} x={padL + band * i + band / 2} y={H - 6} text-anchor="middle">
                {i === last ? 'This wk' : shortDate(w.weekStart)}
              </text>
            ) : null,
          )}
        </g>
        {weeks.map((w, i) => {
          const cx = padL + band * i + band / 2;
          const dim = hover !== null && hover !== i ? 0.45 : 1;
          return (
            <g key={w.weekStart} opacity={dim}>
              <path d={column(cx - bw - 1, bw, y(w.added), y(0))} fill="var(--chart-muted)" />
              <path d={column(cx + 1, bw, y(w.count), y(0))} fill="var(--seq)" />
              <rect class="hit" x={padL + band * i} y={padT} width={band} height={plotH} onMouseEnter={() => setHover(i)} onClick={() => setHover(hover === i ? null : i)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          class="chart-tip"
          style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%`, top: `${(y(Math.max(weeks[hover].count, weeks[hover].added)) / H) * 100}%` }}
        >
          Week of {shortDate(weeks[hover].weekStart)}: <b>{weeks[hover].added}</b> added · <b>{weeks[hover].count}</b> done
        </div>
      )}
      </div>
    </div>
  );
}
