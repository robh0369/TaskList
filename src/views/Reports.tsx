import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Task } from '../api/types';
import { Empty, Seg } from '../components/common';
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
  const [metric, setMetric] = useState<'count' | 'effort'>('effort');
  const [tables, setTables] = useState(false);
  const r = useMemo(() => buildReport(data, range), [data, range]);
  const ctx = useRowContext(data, onOpen);
  const members = byId(activeMembers(data));
  const cats = byId(data.categories);

  const loads = r.workload.filter((l) => members.has(l.memberId));
  const totalLoad = loads.reduce((s, l) => s + l[metric], 0);
  const catMax = Math.max(1, ...r.categories.map((c) => c.count));
  const rangeLabel = range === 7 ? 'last 7 days' : range === 30 ? 'last 30 days' : 'last 90 days';

  return (
    <div class="content">
      <Seg label="Range" value={range} onChange={setRange} options={[[7, 'Week'], [30, 'Month'], [90, '90 days']]} />

      <div class="stats" style={{ marginTop: 14 }}>
        <div class="stat"><div class="label">Completed</div><div class="value" data-testid="stat-done">{r.totalDone}</div></div>
        <div class="stat"><div class="label">Effort pts</div><div class="value">{r.totalEffort}</div></div>
        <div class="stat"><div class="label">On time</div><div class="value">{r.onTimeRate === null ? '–' : Math.round(r.onTimeRate * 100) + '%'}</div></div>
      </div>

      {/* Workload split */}
      <section class="section">
        <div class="card card-pad chart-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div>
              <h3>Workload split</h3>
              <div class="sub">Share of {metric === 'effort' ? 'effort points' : 'tasks'} completed, {rangeLabel}. Shared tasks count half each.</div>
            </div>
          </div>
          <Seg label="Measure" value={metric} onChange={setMetric} options={[['effort', 'Effort'], ['count', 'Tasks']]} />
          {totalLoad > 0 ? (
            <>
              <div class="split-bar" role="img" aria-label={loads.map((l) => `${members.get(l.memberId)?.name}: ${Math.round((l[metric] / totalLoad) * 100)}%`).join(', ')} style={{ marginTop: 14 }}>
                {loads.map((l) => (
                  <i key={l.memberId} style={{ width: `${(l[metric] / totalLoad) * 100}%`, background: members.get(l.memberId)?.color }} title={`${members.get(l.memberId)?.name}: ${fmt(l[metric])}`} />
                ))}
              </div>
              <div class="split-rows">
                <span class="hd" />
                <span class="hd" />
                <span class="hd num">Tasks</span>
                <span class="hd num">Effort</span>
                {loads.map((l) => {
                  const m = members.get(l.memberId)!;
                  return (
                    <Fragment key={l.memberId}>
                      <i style={{ width: 10, height: 10, borderRadius: 3, background: m.color, display: 'inline-block' }} />
                      <span>{m.name} <span style={{ color: 'var(--text-3)' }}>· {Math.round((l[metric] / totalLoad) * 100)}%</span></span>
                      <span class="num">{fmt(l.count)}</span>
                      <span class="num">{fmt(l.effort)}</span>
                    </Fragment>
                  );
                })}
              </div>
            </>
          ) : (
            <p class="sub" style={{ marginTop: 12 }}>Nothing completed in this range yet.</p>
          )}
        </div>
      </section>

      {/* Completion trend */}
      <section class="section">
        <div class="card card-pad chart-card">
          <h3>Completed per week</h3>
          <div class="sub">
            Tap a column for details.
            {r.onTimeRate !== null && ` ${Math.round(r.onTimeRate * 100)}% of dated tasks were done on time (${rangeLabel}).`}
          </div>
          <WeeklyColumns weeks={r.weekly} />
          <button class="btn ghost table-toggle" onClick={() => setTables(!tables)}>{tables ? 'Hide table' : 'Show as table'}</button>
          {tables && (
            <table class="data-table">
              <thead><tr><th>Week of</th><th>Done</th><th>On time</th></tr></thead>
              <tbody>
                {r.weekly.map((w) => (
                  <tr key={w.weekStart}>
                    <td>{shortDate(w.weekStart)}</td>
                    <td>{w.count}</td>
                    <td>{w.withDue ? `${w.onTime}/${w.withDue}` : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Category breakdown */}
      <section class="section">
        <div class="card card-pad chart-card">
          <h3>By category</h3>
          <div class="sub">Tasks completed, {rangeLabel}.</div>
          {r.categories.length ? (
            <div class="hbar">
              {r.categories.map((c) => {
                const cat = cats.get(c.categoryId);
                return (
                  <Fragment key={c.categoryId}>
                    <span class="name" title={cat?.name}>{cat ? `${cat.icon} ${cat.name}` : 'Uncategorized'}</span>
                    <span class="track" title={`${c.count} tasks · ${c.effort} effort`}>
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

      {/* Overdue & upcoming */}
      <section class="section">
        <div class="section-h"><h2 class="danger">Overdue</h2><span class="count">{r.overdue.length}</span></div>
        {r.overdue.length ? (
          <div class="card">{r.overdue.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
        ) : (
          <div class="card"><Empty icon="✅" title="Nothing overdue" /></div>
        )}
      </section>
      <section class="section">
        <div class="section-h"><h2>Due in the next 7 days</h2><span class="count">{r.dueThisWeek.length}</span></div>
        {r.dueThisWeek.length > 0 && <div class="card">{r.dueThisWeek.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>}
      </section>
      {r.stale.length > 0 && (
        <section class="section">
          <div class="section-h"><h2>Stale · untouched 2+ weeks</h2><span class="count">{r.stale.length}</span></div>
          <div class="card">{r.stale.map((t) => <TaskRow key={t.id} task={t} ctx={ctx} />)}</div>
        </section>
      )}
    </div>
  );
}
