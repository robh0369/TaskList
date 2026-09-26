import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Seg } from '../components/common';
import { WeeklyColumns } from '../components/charts/WeeklyColumns';
import { TaskRow } from '../components/TaskRow';
import { useRowContext } from '../components/useRowContext';
import { shortDate } from '../lib/dates';
import { buildReport, type Range } from '../lib/reports';
import { activeMembers, byId } from '../store/selectors';
import { useStore } from '../store/store';

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function ReportsView({ onOpen }: { onOpen: (t: Task) => void }) {
  const { data } = useStore();
  const [range, setRange] = useState<Range>(30);
  const [tables, setTables] = useState(false);
  const r = useMemo(() => buildReport(data, range), [data, range]);
  const ctx = useRowContext(data, onOpen);
  const members = byId(activeMembers(data));
  const cats = byId(data.categories);

  const loads = r.workload.filter((l) => members.has(l.memberId));
  const totalLoad = loads.reduce((s, l) => s + l.count, 0);
  const catMax = Math.max(1, ...r.categories.map((c) => c.count));
  const rangeLabel = range === 7 ? 'last 7 days' : range === 30 ? 'last 30 days' : 'last 90 days';

  return (
    <div class="content">
      <Seg label="Range" value={range} onChange={setRange} options={[[7, 'Week'], [30, 'Month'], [90, '90 days']]} />

      <div class="stats">
        <div class="stat">
          <div class="label">Completed</div>
          <div class="value" data-testid="stat-done">{r.totalDone}</div>
        </div>
        <div class="stat">
          <div class="label">Added</div>
          <div class="value">{r.totalAdded}</div>
        </div>
        <div class="stat">
          <div class="label">Open</div>
          <div class="value">{r.openCount}</div>
        </div>
      </div>

      <section class="section">
        <div class="card card-pad chart-card">
          <h3>Workload split</h3>
          <div class="sub">Tasks completed, {rangeLabel}. Shared tasks count half for each person.</div>
          {totalLoad > 0 ? (
            <>
              <div
                class="split-bar"
                role="img"
                aria-label={loads.map((l) => `${members.get(l.memberId)?.name}: ${Math.round((l.count / totalLoad) * 100)}%`).join(', ')}
              >
                {loads.map((l) => (
                  <i key={l.memberId} style={{ width: `${(l.count / totalLoad) * 100}%`, background: members.get(l.memberId)?.color }} />
                ))}
              </div>
              <div class="split-rows">
                {loads.map((l) => {
                  const m = members.get(l.memberId)!;
                  return (
                    <Fragment key={l.memberId}>
                      <i class="swatch-sm" style={{ background: m.color }} />
                      <span>{m.name}</span>
                      <span class="num">{fmt(l.count)}</span>
                      <span class="num muted">{Math.round((l.count / totalLoad) * 100)}%</span>
                    </Fragment>
                  );
                })}
              </div>
            </>
          ) : (
            <p class="sub">Nothing completed in this range yet.</p>
          )}
        </div>
      </section>

      <section class="section">
        <div class="card card-pad chart-card">
          <h3>Added vs done per week</h3>
          <div class="sub">When done keeps up with added, the list isn't growing. Tap a week for details.</div>
          <WeeklyColumns weeks={r.weekly} />
          <button class="btn ghost table-toggle" onClick={() => setTables(!tables)}>{tables ? 'Hide table' : 'Show as table'}</button>
          {tables && (
            <table class="data-table">
              <thead><tr><th>Week of</th><th>Added</th><th>Done</th></tr></thead>
              <tbody>
                {r.weekly.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{shortDate(w.weekStart)}</td>
                    <td>{w.added}</td>
                    <td>{w.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section class="section">
        <div class="card card-pad chart-card">
          <h3>By category</h3>
          <div class="sub">Tasks completed, {rangeLabel}.</div>
          {r.categories.length ? (
            <div class="hbar">
              {r.categories.map((c) => {
                const name = cats.get(c.categoryId)?.name ?? 'Uncategorized';
                return (
                  <Fragment key={c.categoryId}>
                    <span class="name" title={name}>{name}</span>
                    <span class="track" title={`${c.count} tasks`}>
                      <i style={{ width: `${(c.count / catMax) * 100}%` }} />
                    </span>
                    <span class="num">{c.count}</span>
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <p class="sub">Nothing completed in this range yet.</p>
          )}
        </div>
      </section>

      {r.stale.length > 0 && (
        <section class="section">
          <div class="section-h"><h2>Waiting 2+ weeks</h2><span class="count">{r.stale.length}</span></div>
          <div class="card">{r.stale.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
        </section>
      )}
    </div>
  );
}
