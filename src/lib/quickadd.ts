import type { Category, Member, Priority, Recurrence } from '../api/types';
import { addDays, parseISODate, today } from './dates';

export interface QuickAddResult {
  title: string;
  dueDate: string;
  assigneeId: string;
  categoryId: string;
  priority: Priority;
  recurrence: Recurrence | null;
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
/** Whole-word weekday names and common abbreviations (so "sunroom" isn't Sunday). */
const DAY = '(?:sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:s|nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)';

function dayIndex(word: string): number {
  const w = word.toLowerCase().slice(0, 3);
  return DAY_NAMES.indexOf(w);
}

function nextWeekday(from: string, target: number): string {
  const cur = parseISODate(from).getDay();
  const diff = (target - cur + 7) % 7 || 7;
  return addDays(from, diff);
}

/**
 * Parses shorthand like "Mow lawn fri @Rob #Yard every 2 weeks !high".
 *   @name     assignee (member name prefix, or @both)
 *   #cat      category (name prefix)
 *   !high/!low priority
 *   today, tomorrow, mon..sun, in N days
 *   daily, weekly, monthly, every N days|weeks|months, every mon[,thu]
 */
export function parseQuickAdd(
  input: string,
  members: Member[],
  categories: Category[],
  now = today(),
): QuickAddResult {
  const result: QuickAddResult = {
    title: '',
    dueDate: '',
    assigneeId: '',
    categoryId: '',
    priority: 'med',
    recurrence: null,
  };
  let text = ' ' + input + ' ';

  const take = (re: RegExp, fn: (m: RegExpMatchArray) => boolean | void) => {
    const m = text.match(re);
    if (m && fn(m) !== false) text = text.replace(m[0], ' ');
  };

  take(/\s@(\w+)/i, (m) => {
    const q = m[1].toLowerCase();
    if (q === 'both' || q === 'us') {
      result.assigneeId = 'both';
      return;
    }
    const hit = members.find((p) => p.name.toLowerCase().startsWith(q));
    if (!hit) return false;
    result.assigneeId = hit.id;
  });

  take(/\s#([\w-]+)/i, (m) => {
    const q = m[1].toLowerCase();
    const hit = categories.find((c) => c.name.toLowerCase().replace(/\s+/g, '').startsWith(q));
    if (!hit) return false;
    result.categoryId = hit.id;
  });

  take(/\s!(high|low|med)\b/i, (m) => {
    result.priority = m[1].toLowerCase() as Priority;
  });

  // Recurrence first, so "every mon" isn't read as a due date.
  take(/\severy\s+(\d+)\s+(day|week|month)s?\b/i, (m) => {
    const unit = m[2].toLowerCase();
    result.recurrence = {
      freq: unit === 'day' ? 'daily' : unit === 'week' ? 'weekly' : 'monthly',
      interval: Number(m[1]),
      mode: 'fixed',
    };
  });
  if (!result.recurrence) {
    take(new RegExp(`\\severy\\s+(${DAY}(?:\\s*(?:,|and)\\s*${DAY})*)\\b`, 'i'), (m) => {
      const days = m[1]
        .split(/\s*(?:,|\band\b)\s*|\s+/)
        .map(dayIndex)
        .filter((i) => i >= 0);
      if (!days.length) return false;
      result.recurrence = { freq: 'weekly', interval: 1, byWeekday: days, mode: 'fixed' };
      if (!result.dueDate) {
        const next = days.map((d) => (parseISODate(now).getDay() === d ? now : nextWeekday(now, d))).sort()[0];
        result.dueDate = next;
      }
    });
  }
  if (!result.recurrence) {
    take(/\s(daily|every day|weekly|every week|monthly|every month)\b/i, (m) => {
      const w = m[1].toLowerCase();
      const freq = w.includes('da') ? 'daily' : w.includes('week') ? 'weekly' : 'monthly';
      result.recurrence = { freq, interval: 1, mode: 'fixed' };
    });
  }

  take(/\s(today|tonight)\b/i, () => {
    result.dueDate = now;
  });
  take(/\s(tomorrow|tmrw)\b/i, () => {
    result.dueDate = addDays(now, 1);
  });
  take(/\sin\s+(\d+)\s+days?\b/i, (m) => {
    result.dueDate = addDays(now, Number(m[1]));
  });
  take(new RegExp(`\\s(?:next\\s+)?(${DAY})\\b`, 'i'), (m) => {
    result.dueDate = nextWeekday(now, dayIndex(m[1]));
  });

  if (result.recurrence && !result.dueDate) result.dueDate = now;
  result.title = text.replace(/\s+/g, ' ').trim();
  return result;
}
