import type { Category, Collections, Member, Priority, Task } from '../api/types';
import { blankTask } from './defaults';
import { STEP } from './rank';

/**
 * Rob & Rebecca's starting list, transcribed from the handwritten sheet.
 * Daily items (dishes, laundry, meal prep) are intentionally left off.
 * "HIRE" items go in the Hire out category, assigned to Rebecca to arrange.
 *
 * IDs are fixed so importing twice (or from both phones) never duplicates.
 */

export const HIRE_CATEGORY_ID = 'c-hire';

// Category ids match the seeded defaults in apps-script/Code.gs and lib/defaults.ts.
const KITCHEN = 'c1';
const CLEANING = 'c2';
const YARD = 'c4';
const ERRANDS = 'c6';
const REPAIR = 'c7';
const PETS = 'c9';

const ROB = 'm1';
const BEC = 'm2';

type Row = [title: string, assigneeId: string, categoryId: string, priority: Priority];

export const STARTER_TASKS: Row[] = [
  // Rob
  ['Clean Adirondack chairs & bring up to deck', ROB, YARD, 'med'],
  ['Walk dog', ROB, PETS, 'low'],
  ["Bathe & trim Sadie's nails", ROB, PETS, 'low'],
  ["Take blinds down in R/R & Michael's room", ROB, REPAIR, 'high'],
  ['Dust light fixtures & ceiling fans', ROB, CLEANING, 'low'],
  ['Change light bulbs in foyer', ROB, REPAIR, 'med'],
  ["Clean Rob's office", ROB, CLEANING, 'low'],
  ['Ensure we have propane', ROB, ERRANDS, 'low'],
  ["Declutter kids' rooms", ROB, CLEANING, 'high'],
  ["Clean kids' rooms", ROB, CLEANING, 'high'],
  ['Pressure wash driveway & sidewalk', ROB, YARD, 'med'],
  ['Unclog master bathroom drain', ROB, REPAIR, 'high'],
  ['Clean beer fridge', ROB, KITCHEN, 'high'],
  // On both lists
  ['Clean up back deck', 'both', YARD, 'med'],
  // Rebecca
  ['Water plants', BEC, YARD, 'med'],
  ['Spray for deer', BEC, YARD, 'med'],
  ['Mow / weedeat / edge', BEC, YARD, 'low'],
  ['Weed flower beds', BEC, YARD, 'low'],
  ['Grocery shop', BEC, ERRANDS, 'med'],
  ['Touch up walls', BEC, REPAIR, 'low'],
  ['Clean front entryway', BEC, CLEANING, 'med'],
  ['Clean furniture', BEC, CLEANING, 'high'],
  // Hire out (Rebecca arranges)
  ['Patch woodpecker holes', BEC, HIRE_CATEGORY_ID, 'low'],
  ['Front door wood repair', BEC, HIRE_CATEGORY_ID, 'low'],
  ['Shutters hanging off house', BEC, HIRE_CATEGORY_ID, 'med'],
  ['Fix flashing', BEC, HIRE_CATEGORY_ID, 'low'],
  ['Mop floors', BEC, HIRE_CATEGORY_ID, 'high'],
  ['Shampoo all carpets', BEC, HIRE_CATEGORY_ID, 'high'],
  ['Clean all bathrooms, showers & drains', BEC, HIRE_CATEGORY_ID, 'high'],
];

export function starterId(i: number): string {
  return 'starter-' + String(i + 1).padStart(2, '0');
}

export interface StarterPlan {
  tasks: Task[];
  categories: Category[];
  members: Member[];
}

/** What importing would add or change, given the current data. Empty when already imported. */
export function planStarterImport(data: Collections, meId = ''): StarterPlan {
  const have = new Set(data.tasks.map((t) => t.id));
  const tasks = STARTER_TASKS.flatMap(([title, assigneeId, categoryId, priority], i) =>
    have.has(starterId(i))
      ? []
      : [blankTask({ id: starterId(i), title, assigneeId, categoryId, priority, effort: (i + 1) * STEP, createdBy: meId })],
  );

  const categories: Category[] = [];
  if (!data.categories.some((c) => c.id === HIRE_CATEGORY_ID)) {
    const order = Math.max(0, ...data.categories.map((c) => c.sortOrder)) + 1;
    categories.push({ id: HIRE_CATEGORY_ID, name: 'Hire out', icon: '', sortOrder: order, updatedAt: '', deleted: false });
  }

  // Only rename the placeholder names; never overwrite names you've set.
  const names: Record<string, string> = { [ROB]: 'Rob', [BEC]: 'Rebecca' };
  const members = data.members
    .filter((m) => names[m.id] && /^Partner [AB]$/.test(m.name))
    .map((m) => ({ ...m, name: names[m.id] }));

  return { tasks, categories, members };
}
