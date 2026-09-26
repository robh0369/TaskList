import type { Category, Collections, Member, Task } from '../api/types';
import { addDays, today } from './dates';
import { STEP } from './rank';

/**
 * Member colors are the first categorical slots of the reference data-viz palette
 * (validated for color-vision deficiency). Color follows the person everywhere.
 */
export const MEMBER_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#4a3aa7', '#eda100'];

let counter = 0;
export function uid(prefix = ''): string {
  counter = (counter + 1) % 1296;
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + counter.toString(36);
}

const EPOCH = '2000-01-01T00:00:00.000Z';

export function defaultMembers(): Member[] {
  return [
    { id: 'm1', name: 'Partner A', color: MEMBER_COLORS[0], updatedAt: EPOCH, deleted: false },
    { id: 'm2', name: 'Partner B', color: MEMBER_COLORS[1], updatedAt: EPOCH, deleted: false },
  ];
}

const CATS: [string, string][] = [
  ['Kitchen', ''],
  ['Cleaning', ''],
  ['Laundry', ''],
  ['Yard', ''],
  ['Finances', ''],
  ['Errands', ''],
  ['Home Repair', ''],
  ['Car', ''],
  ['Pets', ''],
];

export function defaultCategories(): Category[] {
  return CATS.map(([name, icon], i) => ({
    id: 'c' + (i + 1),
    name,
    icon,
    sortOrder: i,
    updatedAt: EPOCH,
    deleted: false,
  }));
}

export function blankTask(partial: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: uid('t'),
    title: '',
    notes: '',
    assigneeId: '',
    categoryId: '',
    projectId: '',
    parentId: '',
    dueDate: '',
    priority: 'med',
    // Position within its priority section: new tasks go to the bottom (see lib/rank.ts).
    effort: Date.now(),
    status: 'open',
    recurrence: null,
    createdBy: '',
    createdAt: now,
    updatedAt: now,
    completedAt: '',
    completedBy: '',
    deleted: false,
    ...partial,
  };
}

/** Sample data so demo mode has something to look at. */
export function demoSeed(): Collections {
  const t = today();
  const members = defaultMembers();
  members[0].name = 'Alex';
  members[1].name = 'Sam';
  const cats = defaultCategories();
  const tasks: Task[] = [
    blankTask({ title: 'Replace furnace filter', assigneeId: 'm2', categoryId: 'c2' }),
    blankTask({ title: 'Pay electric bill', assigneeId: 'm1', categoryId: 'c5', priority: 'high' }),
    blankTask({ title: 'Mow the lawn', assigneeId: 'm1', categoryId: 'c4', priority: 'high' }),
    blankTask({ title: 'Clean out fridge', assigneeId: 'both', categoryId: 'c1' }),
    blankTask({ title: 'Oil change', assigneeId: 'm2', categoryId: 'c8', priority: 'low' }),
    blankTask({ title: 'Buy paint & supplies', assigneeId: 'm2', categoryId: 'c6' }),
    blankTask({ title: 'Patch & sand walls', assigneeId: 'm1', categoryId: 'c7' }),
    blankTask({ title: 'Paint walls (2 coats)', assigneeId: 'both', categoryId: 'c7' }),
    blankTask({ title: 'Organize garage shelves', assigneeId: 'm2', categoryId: 'c2', priority: 'low' }),
  ].map((task, i) => ({ ...task, effort: (i + 1) * STEP }));
  // A few weeks of history so reports aren't empty.
  const completions = [];
  const titles: [string, string, number][] = [
    ['Vacuum living room', 'c2', 2],
    ['Grocery run', 'c6', 2],
    ['Dishes', 'c1', 1],
    ['Laundry', 'c3', 2],
    ['Weed garden', 'c4', 3],
    ['Litter box', 'c9', 1],
  ];
  for (let i = 0; i < 38; i++) {
    const [title, cat, effort] = titles[i % titles.length];
    const day = addDays(t, -Math.floor(i * 1.1) - 1);
    const who = i % 3 === 0 ? 'm2' : i % 5 === 0 ? 'both' : i % 2 ? 'm1' : 'm2';
    completions.push({
      id: uid('x'),
      taskId: '',
      title,
      completedBy: who,
      completedAt: new Date(day + 'T18:00:00').toISOString(),
      dueDate: '',
      effort,
      categoryId: cat,
      updatedAt: new Date().toISOString(),
      deleted: false,
    });
  }
  return { tasks, completions, projects: [], comments: [], members, categories: cats };
}
