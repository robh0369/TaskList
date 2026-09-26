import { describe, expect, it } from 'vitest';
import { defaultCategories, defaultMembers } from '../src/lib/defaults';
import { parseQuickAdd } from '../src/lib/quickadd';

const members = defaultMembers();
members[0].name = 'Rob';
members[1].name = 'Rebecca';
const cats = defaultCategories();

describe('parseQuickAdd', () => {
  it('parses person, category and priority', () => {
    const r = parseQuickAdd('Mow lawn @Rob #Yard !high', members, cats);
    expect(r).toEqual({ title: 'Mow lawn', assigneeId: 'm1', categoryId: 'c4', priority: 'high' });
  });

  it('handles @both and !mid', () => {
    const r = parseQuickAdd('Call plumber !mid @both', members, cats);
    expect(r).toMatchObject({ title: 'Call plumber', priority: 'med', assigneeId: 'both' });
  });

  it('matches category names with spaces', () => {
    expect(parseQuickAdd('Fix hinge #home', members, cats).categoryId).toBe('c7');
  });

  it('leaves unknown tokens and date words in the title', () => {
    const r = parseQuickAdd('Email @nobody about #nothing tomorrow', members, cats);
    expect(r).toEqual({ title: 'Email @nobody about #nothing tomorrow', assigneeId: '', categoryId: '', priority: '' });
  });
});
