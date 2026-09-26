import { describe, expect, it } from 'vitest';
import type { Task } from '../src/api/types';
import { blankTask } from '../src/lib/defaults';
import { planMove, rankOf, STEP } from '../src/lib/rank';
import { sortTasks } from '../src/store/selectors';

const t = (id: string, effort: number, priority: Task['priority'] = 'high', createdAt = '2026-09-01T00:00:00Z') =>
  blankTask({ id, title: id, effort, priority, createdAt });

describe('planMove', () => {
  const lane = [t('a', 1024), t('b', 2048), t('c', 3072)];

  it('places between two neighbors at the midpoint', () => {
    const plan = planMove(lane, lane[2], 'high', 'b', null)!;
    expect(plan.task.effort).toBe(1536);
    expect(plan.renumbered).toEqual([]);
  });

  it('moves to the top and to the bottom', () => {
    expect(planMove(lane, lane[2], 'high', 'a', null)!.task.effort).toBe(1024 - STEP);
    expect(planMove(lane, lane[0], 'high', null, 'c')!.task.effort).toBe(3072 + STEP);
    expect(planMove(lane, lane[0], 'high', null, null)!.task.effort).toBe(3072 + STEP);
  });

  it('returns null when the task would stay where it is', () => {
    expect(planMove(lane, lane[1], 'high', 'c', null)).toBeNull(); // in front of its own next
    expect(planMove(lane, lane[2], 'high', null, 'b')).toBeNull(); // after its own previous (it is last)
  });

  it('renumbers the section when neighbors tie (tasks created before reordering)', () => {
    const legacy = [t('a', 2, 'high', '2026-09-01T00:00:00Z'), t('b', 2, 'high', '2026-09-02T00:00:00Z'), t('c', 2, 'high', '2026-09-03T00:00:00Z')];
    const plan = planMove(legacy, legacy[0], 'high', 'c', null)!;
    // New order: b, a, c
    expect(plan.task.effort).toBe(2 * STEP);
    expect(plan.renumbered.map((x) => [x.id, x.effort])).toEqual([['b', STEP], ['c', 3 * STEP]]);
    const after = [...plan.renumbered, plan.task].sort(sortTasks).map((x) => x.id);
    expect(after).toEqual(['b', 'a', 'c']);
  });

  it('moves across sections to the chosen spot', () => {
    const med = [t('m1', 1024, 'med'), t('m2', 2048, 'med')];
    const plan = planMove(med, lane[0], 'med', 'm2', null)!;
    expect(plan.task).toMatchObject({ priority: 'med', effort: 1536 });
    // Into an empty section keeps its rank.
    expect(planMove([], lane[0], 'low', null, null)!.task).toMatchObject({ priority: 'low', effort: 1024 });
  });

  it('drops after the last visible task when a filter hides later ones', () => {
    // x is hidden by a filter; dropping below visible "b" should land between b and x.
    const full = [t('a', 1024), t('b', 2048), t('x', 3072), t('c', 4096)];
    const plan = planMove(full, full[0], 'high', null, 'b')!;
    expect(plan.task.effort).toBe(2560);
  });
});

describe('sortTasks uses rank', () => {
  it('orders by priority, then rank, then age', () => {
    const list = [t('late', 5000), t('early', 100), t('med', 1, 'med'), t('tieOld', 2, 'high', '2026-01-01T00:00:00Z'), t('tieNew', 2, 'high', '2026-02-01T00:00:00Z')];
    expect(list.sort(sortTasks).map((x) => x.id)).toEqual(['tieOld', 'tieNew', 'early', 'late', 'med']);
  });

  it('puts new tasks at the bottom of a reordered section', () => {
    const fresh = blankTask({ id: 'new', priority: 'high' });
    expect(rankOf(fresh)).toBeGreaterThan(100 * STEP);
    expect([fresh, t('a', 1024)].sort(sortTasks).map((x) => x.id)).toEqual(['a', 'new']);
  });
});
