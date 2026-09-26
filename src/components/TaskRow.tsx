import type { ComponentChildren } from 'preact';
import type { Category, Member, Task } from '../api/types';
import { relativeLabel } from '../lib/dates';
import { describeRecurrence } from '../lib/recurrence';
import { dueClass } from '../store/selectors';
import { completeTask, reopenTask } from '../store/store';
import { AssigneeAvatar } from './common';
import { IconCheck, IconComment, IconRepeat, IconSub } from './icons';

export interface RowContext {
  members: Member[];
  categories: Map<string, Category>;
  commentCounts: Map<string, number>;
  subtaskCounts: Map<string, { done: number; total: number }>;
  onOpen: (t: Task) => void;
}

export interface TaskRowProps {
  task: Task;
  ctx: RowContext;
  /** Hide the "High" label (e.g. in the ranked list, where the section shows it). */
  hidePriority?: boolean;
  /** Extra control at the end of the row, such as a drag handle. */
  trailing?: ComponentChildren;
  class?: string;
}

export function TaskRow({ task, ctx, hidePriority, trailing, class: extra }: TaskRowProps) {
  const cat = ctx.categories.get(task.categoryId);
  const comments = ctx.commentCounts.get(task.id) ?? 0;
  const subs = ctx.subtaskCounts.get(task.id);
  const done = task.status === 'done';

  const toggle = (e: Event) => {
    e.stopPropagation();
    if (done) reopenTask(task);
    else completeTask(task);
  };

  const meta = [
    !hidePriority && !done && task.priority === 'high' && (
      <span key="p" class="meta-high">High</span>
    ),
    task.dueDate && !done && (
      <span key="d" class={dueClass(task.dueDate)}>{relativeLabel(task.dueDate)}</span>
    ),
    task.recurrence && (
      <span key="r" title={describeRecurrence(task.recurrence)}>
        <IconRepeat />
        <span class="sr-only">{describeRecurrence(task.recurrence)}</span>
      </span>
    ),
    cat && <span key="c">{cat.name}</span>,
    subs && subs.total > 0 && (
      <span key="s">
        <IconSub /> {subs.done}/{subs.total}
      </span>
    ),
    comments > 0 && (
      <span key="m">
        <IconComment /> {comments}
      </span>
    ),
  ].filter(Boolean);

  return (
    <div class={`task prio-${task.priority} ${done ? 'is-done' : ''} ${extra ?? ''}`} data-testid="task-row" data-task-id={task.id}>
      <button class={`check ${done ? 'done' : ''}`} onClick={toggle} aria-label={done ? `Mark "${task.title}" not done` : `Complete "${task.title}"`}>
        <IconCheck />
      </button>
      <button class="task-body" onClick={() => ctx.onOpen(task)}>
        <div class="task-title">{task.title}</div>
        {meta.length > 0 && <div class="task-meta">{meta}</div>}
      </button>
      <AssigneeAvatar assigneeId={task.assigneeId} members={ctx.members} size="sm" />
      {trailing}
    </div>
  );
}
