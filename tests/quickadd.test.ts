import { describe, expect, it } from 'vitest';
import { defaultCategories, defaultMembers } from '../src/lib/defaults';
import { parseQuickAdd } from '../src/lib/quickadd';

const members = defaultMembers();
members[0].name = 'Rob';
members[1].name = 'Jen';
const cats = defaultCategories();
const NOW = '2026-09-26'; // Saturday

describe('parseQuickAdd', () => {
  it('parses the full shorthand', () => {
    const r = parseQuickAdd('Mow lawn fri @Rob #Yard every 2 weeks', members, cats, NOW);
    expect(r.title).toBe('Mow lawn');
    expect(r.dueDate).toBe('2026-10-02');
    expect(r.assigneeId).toBe('m1');
    expect(r.categoryId).toBe('c4');
    expect(r.recurrence).toMatchObject({ freq: 'weekly', interval: 2 });
  });

  it('handles tomorrow, priority and @both', () => {
    const r = parseQuickAdd('Call plumber tomorrow !high @both', members, cats, NOW);
    expect(r).toMatchObject({ title: 'Call plumber', dueDate: '2026-09-27', priority: 'high', assigneeId: 'both' });
  });

  it('every <weekday> sets a weekly rule and the next due date', () => {
    const r = parseQuickAdd('Trash out every tue', members, cats, NOW);
    expect(r.recurrence).toMatchObject({ freq: 'weekly', byWeekday: [2] });
    expect(r.dueDate).toBe('2026-09-29');
    expect(r.title).toBe('Trash out');
  });

  it('every mon and thu', () => {
    const r = parseQuickAdd('Water plants every mon and thu', members, cats, NOW);
    expect(r.recurrence).toMatchObject({ freq: 'weekly', byWeekday: [1, 4] });
    expect(r.title).toBe('Water plants');
  });

  it('leaves unknown tokens in the title', () => {
    const r = parseQuickAdd('Email @nobody about #nothing', members, cats, NOW);
    expect(r.title).toBe('Email @nobody about #nothing');
    expect(r.assigneeId).toBe('');
  });

  it('does not eat weekday-like words inside other words', () => {
    const r = parseQuickAdd('Clean sunroom', members, cats, NOW);
    expect(r.title).toBe('Clean sunroom');
    expect(r.dueDate).toBe('');
  });

  it('monthly defaults due date to today', () => {
    const r = parseQuickAdd('Change HVAC filter monthly #home', members, cats, NOW);
    expect(r).toMatchObject({ title: 'Change HVAC filter', dueDate: NOW, categoryId: 'c7' });
  });
});
