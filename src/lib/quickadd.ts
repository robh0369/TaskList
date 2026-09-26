import type { Category, Member, Priority } from '../api/types';

export interface QuickAddResult {
  title: string;
  assigneeId: string;
  categoryId: string;
  priority: Priority | '';
}

/**
 * Parses shorthand like "Fix gutter @Rob #Home !high".
 *   @name      assignee (member name prefix, or @both)
 *   #cat       category (name prefix, spaces ignored)
 *   !high / !mid / !low   priority
 * Tokens that don't match anything stay in the title.
 */
export function parseQuickAdd(input: string, members: Member[], categories: Category[]): QuickAddResult {
  const result: QuickAddResult = { title: '', assigneeId: '', categoryId: '', priority: '' };
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

  take(/\s!(high|hi|low|lo|med|mid|medium)\b/i, (m) => {
    const w = m[1].toLowerCase();
    result.priority = w.startsWith('h') ? 'high' : w.startsWith('l') ? 'low' : 'med';
  });

  result.title = text.replace(/\s+/g, ' ').trim();
  return result;
}
