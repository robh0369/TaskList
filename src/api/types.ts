export type ID = string;

export type Freq = 'daily' | 'weekly' | 'monthly';

export interface Recurrence {
  freq: Freq;
  interval: number;
  /** 0 = Sunday … 6 = Saturday. Weekly only. */
  byWeekday?: number[];
  /** 1–31. Monthly only; clamps to the last day of short months. */
  byMonthDay?: number;
  /** fixed: next date follows the schedule. afterCompletion: counts from the day it was done. */
  mode: 'fixed' | 'afterCompletion';
}

export type Priority = 'low' | 'med' | 'high';

export interface Task extends Row {
  id: ID;
  title: string;
  notes: string;
  /** Member id, 'both', or '' for unassigned. */
  assigneeId: string;
  categoryId: string;
  projectId: string;
  parentId: string;
  /** YYYY-MM-DD, or '' for no due date. */
  dueDate: string;
  priority: Priority;
  effort: number;
  status: 'open' | 'done';
  recurrence: Recurrence | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  completedBy: string;
  deleted: boolean;
}

export interface Completion extends Row {
  id: ID;
  taskId: ID;
  title: string;
  completedBy: string;
  completedAt: string;
  dueDate: string;
  effort: number;
  categoryId: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Project extends Row {
  id: ID;
  name: string;
  description: string;
  ownerId: string;
  targetDate: string;
  color: string;
  status: 'active' | 'done';
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Comment extends Row {
  id: ID;
  taskId: ID;
  authorId: string;
  body: string;
  photoFileId: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Member extends Row {
  id: ID;
  name: string;
  color: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Category extends Row {
  id: ID;
  name: string;
  icon: string;
  sortOrder: number;
  updatedAt: string;
  deleted: boolean;
}

export interface Collections {
  tasks: Task[];
  completions: Completion[];
  projects: Project[];
  comments: Comment[];
  members: Member[];
  categories: Category[];
}

/** Fields every synced row carries. _rev is set by the server only. */
export interface Row {
  id: ID;
  updatedAt: string;
  deleted: boolean;
  _rev?: number;
}

export type CollectionName = keyof Collections;
export type AnyRecord = Collections[CollectionName][number];

export const COLLECTIONS: CollectionName[] = [
  'tasks',
  'completions',
  'projects',
  'comments',
  'members',
  'categories',
];

/** A single write. Every write is an upsert of a whole row; deletes set deleted=true. */
export interface Mutation {
  opId: string;
  collection: CollectionName;
  record: AnyRecord;
}

export interface SyncResult {
  /**
   * Server revision counter. Every row the server writes gets a _rev stamped by the
   * server (never by a device clock), so a device's clock being off can't cause missed rows.
   */
  rev: number;
  changes: Partial<Collections>;
}

export interface Backend {
  readonly kind: 'demo' | 'sheets';
  /** Full data when since is 0, otherwise rows with _rev > since. */
  pull(since: number): Promise<SyncResult>;
  push(mutations: Mutation[]): Promise<SyncResult>;
  uploadPhoto(dataUrl: string, name: string): Promise<{ fileId: string; url: string }>;
  photoUrl(fileId: string): string;
}

export class AuthError extends Error {}
