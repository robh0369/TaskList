import { describe, expect, it } from 'vitest';
import { describeRecurrence, nextOccurrence } from '../src/lib/recurrence';

describe('nextOccurrence', () => {
  it('daily fixed advances from due date', () => {
    expect(nextOccurrence({ freq: 'daily', interval: 1, mode: 'fixed' }, '2026-09-26', '2026-09-26')).toBe('2026-09-27');
  });

  it('fixed schedule that fell behind catches up past today instead of stacking overdue', () => {
    // Due Sep 20 every 3 days, completed Sep 26 → 23 (≤26) → 26 (≤26) → 29
    expect(nextOccurrence({ freq: 'daily', interval: 3, mode: 'fixed' }, '2026-09-20', '2026-09-26')).toBe('2026-09-29');
  });

  it('afterCompletion counts from completion day', () => {
    expect(nextOccurrence({ freq: 'weekly', interval: 2, mode: 'afterCompletion' }, '2026-09-01', '2026-09-26')).toBe('2026-10-10');
  });

  it('weekly on specific weekdays picks the next matching day', () => {
    // 2026-09-26 is a Saturday. Mon & Thu → Mon Sep 28.
    expect(nextOccurrence({ freq: 'weekly', interval: 1, byWeekday: [1, 4], mode: 'fixed' }, '2026-09-26', '2026-09-26')).toBe('2026-09-28');
    // From Mon Sep 28 → Thu Oct 1
    expect(nextOccurrence({ freq: 'weekly', interval: 1, byWeekday: [1, 4], mode: 'fixed' }, '2026-09-28', '2026-09-28')).toBe('2026-10-01');
  });

  it('every other Tuesday skips a week', () => {
    // Tue Sep 29 → Tue Oct 13
    expect(nextOccurrence({ freq: 'weekly', interval: 2, byWeekday: [2], mode: 'fixed' }, '2026-09-29', '2026-09-29')).toBe('2026-10-13');
  });

  it('monthly clamps to end of short months', () => {
    expect(nextOccurrence({ freq: 'monthly', interval: 1, byMonthDay: 31, mode: 'fixed' }, '2027-01-31', '2027-01-31')).toBe('2027-02-28');
    expect(nextOccurrence({ freq: 'monthly', interval: 1, byMonthDay: 31, mode: 'fixed' }, '2027-02-28', '2027-02-28')).toBe('2027-03-31');
  });

  it('monthly crosses the year boundary', () => {
    expect(nextOccurrence({ freq: 'monthly', interval: 2, mode: 'fixed' }, '2026-12-15', '2026-12-15')).toBe('2027-02-15');
  });

  it('completing early keeps the schedule', () => {
    expect(nextOccurrence({ freq: 'weekly', interval: 1, mode: 'fixed' }, '2026-10-01', '2026-09-28')).toBe('2026-10-08');
  });
});

describe('describeRecurrence', () => {
  it('reads naturally', () => {
    expect(describeRecurrence({ freq: 'weekly', interval: 2, byWeekday: [4, 1], mode: 'fixed' })).toBe('Every 2 weeks on Mon, Thu');
    expect(describeRecurrence({ freq: 'daily', interval: 1, mode: 'afterCompletion' })).toBe('Every day (after done)');
  });
});
