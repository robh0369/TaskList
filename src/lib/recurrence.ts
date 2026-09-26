import type { Recurrence } from '../api/types';
import { addDays, daysInMonth, parseISODate, toISODate, weekdayName } from './dates';

function addMonthsClamped(iso: string, months: number, day?: number): string {
  const d = parseISODate(iso);
  const targetDay = day ?? d.getDate();
  const y = d.getFullYear();
  const m = d.getMonth() + months;
  const first = new Date(y, m, 1);
  const clamped = Math.min(targetDay, daysInMonth(first.getFullYear(), first.getMonth()));
  return toISODate(new Date(first.getFullYear(), first.getMonth(), clamped));
}

/**
 * Next due date after a completion.
 * fixed: advance from the old due date until strictly after it (keeps "every Tuesday" on Tuesdays).
 * afterCompletion: advance from the day it was actually done.
 */
export function nextOccurrence(rule: Recurrence, dueDate: string, completedOn: string): string {
  const interval = Math.max(1, rule.interval || 1);
  const base = rule.mode === 'afterCompletion' || !dueDate ? completedOn : dueDate;

  let next: string;
  switch (rule.freq) {
    case 'daily':
      next = addDays(base, interval);
      break;
    case 'weekly': {
      const days = (rule.byWeekday ?? []).slice().sort();
      if (days.length === 0) {
        next = addDays(base, 7 * interval);
        break;
      }
      // Walk forward day by day; only accept weekdays in the rule, and only in
      // weeks that are a multiple of interval from base's week.
      const baseDate = parseISODate(base);
      const baseWeekStart = addDays(base, -baseDate.getDay());
      let cursor = addDays(base, 1);
      for (let i = 0; i < 7 * interval * 2 + 7; i++) {
        const weekIdx = Math.floor((parseISODate(cursor).getTime() - parseISODate(baseWeekStart).getTime()) / (7 * 86_400_000));
        if (weekIdx % interval === 0 && days.includes(parseISODate(cursor).getDay())) break;
        cursor = addDays(cursor, 1);
      }
      next = cursor;
      break;
    }
    case 'monthly':
      next = addMonthsClamped(base, interval, rule.byMonthDay);
      break;
  }

  // A fixed schedule that fell far behind should land on the next date from today,
  // not generate a backlog of overdue instances (or reappear as due the same day).
  if (rule.mode === 'fixed' && next <= completedOn) {
    return nextOccurrence({ ...rule, mode: 'fixed' }, next, completedOn);
  }
  return next;
}

export function describeRecurrence(rule: Recurrence | null): string {
  if (!rule) return '';
  const n = Math.max(1, rule.interval || 1);
  let s: string;
  switch (rule.freq) {
    case 'daily':
      s = n === 1 ? 'Every day' : `Every ${n} days`;
      break;
    case 'weekly': {
      s = n === 1 ? 'Every week' : `Every ${n} weeks`;
      const days = rule.byWeekday ?? [];
      if (days.length) s += ' on ' + days.slice().sort().map(weekdayName).join(', ');
      break;
    }
    case 'monthly':
      s = n === 1 ? 'Every month' : `Every ${n} months`;
      if (rule.byMonthDay) s += ` on day ${rule.byMonthDay}`;
      break;
  }
  if (rule.mode === 'afterCompletion') s += ' (after done)';
  return s;
}
