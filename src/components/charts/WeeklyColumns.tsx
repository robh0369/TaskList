import { useState } from 'preact/hooks';
import type { WeekPoint } from '../../lib/reports';
import { shortDate } from '../../lib/dates';

/** Single-series weekly column chart with per-column hover tooltip. */
export function WeeklyColumns({ weeks }: { weeks: WeekPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const padL = 24;
  const padB = 22;
  const padT = 16;
  const plotW = W - padL;
  const plotH = H - padB - padT;
  const max = Math.max(4, ...weeks.map((w) => w.count));
  const step = max <= 5 ? 1 : max <= 12 ? 2 : Math.ceil(max / 5);
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  const band = plotW / weeks.length;
  const bw = Math.min(24, band * 0.62);
  const y = (v: number) => padT + plotH - (v / top) * plotH;
  const last = weeks.length - 1;

  return (
    <div class="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tasks completed per week">
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
          const x = padL + band * i + (band - bw) / 2;
          const h = Math.max(0, y(0) - y(w.count));
          const r = Math.min(4, h);
          // Rounded data-end, square at the baseline.
          const d = h > 0
            ? `M${x},${y(0)} V${y(w.count) + r} Q${x},${y(w.count)} ${x + r},${y(w.count)} H${x + bw - r} Q${x + bw},${y(w.count)} ${x + bw},${y(w.count) + r} V${y(0)} Z`
            : '';
          return (
            <g key={w.weekStart}>
              {d && <path d={d} fill="var(--seq)" opacity={hover === null || hover === i ? 1 : 0.45} />}
              {i === last && w.count > 0 && <text class="val" x={x + bw / 2} y={y(w.count) - 5} text-anchor="middle">{w.count}</text>}
              <rect
                class="hit"
                x={padL + band * i}
                y={padT}
                width={band}
                height={plotH}
                onMouseEnter={() => setHover(i)}
                onClick={() => setHover(hover === i ? null : i)}
              />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div class="chart-tip" style={{ left: `${((padL + band * hover + band / 2) / W) * 100}%`, top: `${(y(weeks[hover].count) / H) * 100}%` }}>
          Week of {shortDate(weeks[hover].weekStart)}: <b>{weeks[hover].count}</b> done
          {weeks[hover].withDue > 0 && ` · ${Math.round((weeks[hover].onTime / weeks[hover].withDue) * 100)}% on time`}
        </div>
      )}
    </div>
  );
}
