import type { ComponentChildren } from 'preact';
import type { Category, Member, Project, Task } from '../api/types';
import { relativeLabel } from '../lib/dates';
import { describeRecurrence } from '../lib/recurrence';
import { dueClass } from '../store/selectors';
import { completeTask, reopenTask } from '../store/store';
import { AssigneeAvatar } from './common';
import { IconCheck, IconComment, IconFlag, IconFolder, IconRepeat, IconSub } from './icons';

export interface RowContext {
  members: Member[];
  categories: Map<string, Category>;
  projects: Map<string, Project>;
  commentCounts: Map<string, number>;
  subtaskCounts: Map<string, { done: number; total: number }>;
  onOpen: (t: Task) => void;
}

export interface TaskRowProps {
  task: Task;
  ctx: RowContext;
  hideProject?: boolean;
  /** Hide the High/Low label (e.g. on the priority board, where the lane shows it). */
  hidePriority?: boolean;
  /** Extra control at the end of the row, such as a drag handle. */
  trailing?: ComponentChildren;
  class?: string;
}

export function TaskRow({ task, ctx, hideProject, hidePriority, trailing, class: extra }: TaskRowProps) {
  const cat = ctx.categories.get(task.categoryId);
  const project = hideProject ? undefined : ctx.projects.get(task.projectId);
  const comments = ctx.commentCounts.get(task.id) ?? 0;
  const subs = ctx.subtaskCounts.get(task.id);
  const done = task.status === 'done';

  const toggle = (e: Event) => {
    e.stopPropagation();
    if (done) reopenTask(task);
    else completeTask(task);
  };

  return (
    <div class={`task ${done ? 'is-done' : ''} ${extra ?? ''}`} data-testid="task-row" data-task-id={task.id}>
      <button
        class={`check ${done ? 'done' : ''}`}
        data-p={task.priority}
        onClick={toggle}
        aria-label={done ? `Mark "${task.title}" not done` : `Complete "${task.title}"`}
      >
        <IconCheck />
      </button>
      <button class="task-body" onClick={() => ctx.onOpen(task)}>
        <div class="task-title">{task.title}</div>
        <div class="task-meta">
          {!hidePriority && !done && task.priority !== 'med' && (
            <span class={`prio prio-${task.priority}`}>
              <IconFlag /> {task.priority === 'high' ? 'High' : 'Low'}
            </span>
          )}
          {task.dueDate && !done && <span class={dueClass(task.dueDate)}>{relativeLabel(task.dueDate)}</span>}
          {task.recurrence && (
            <span title={describeRecurrence(task.recurrence)}>
              <IconRepeat />
              <span class="sr-only">{describeRecurrence(task.recurrence)}</span>
            </span>
          )}
          {cat && (
            <span>
              {cat.icon} {cat.name}
            </span>
          )}
          {project && (
            <span>
              <IconFolder /> {project.name}
            </span>
          )}
          {subs && subs.total > 0 && (
            <span>
              <IconSub /> {subs.done}/{subs.total}
            </span>
          )}
          {comments > 0 && (
            <span>
              <IconComment /> {comments}
            </span>
          )}
        </div>
      </button>
      <AssigneeAvatar assigneeId={task.assigneeId} members={ctx.members} />
      {trailing}
    </div>
  );
}
