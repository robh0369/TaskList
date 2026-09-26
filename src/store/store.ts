import { useEffect, useState } from 'preact/hooks';
import { SheetsBackend } from '../api/client';
import { DemoBackend } from '../api/mock';
import type { AnyRecord, Backend, Collections, CollectionName, Completion, Mutation, Row, Task } from '../api/types';
import { AuthError, COLLECTIONS } from '../api/types';
import { DEFAULT_API_URL } from '../config';
import { nowStamp, relativeLabel, today } from '../lib/dates';
import { uid } from '../lib/defaults';
import { nextOccurrence } from '../lib/recurrence';

export interface Settings {
  apiUrl: string;
  passcode: string;
  /** Which household member is using this device. */
  meId: string;
  theme: 'system' | 'light' | 'dark';
}

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'auth';

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

export interface State {
  data: Collections;
  rev: number;
  outbox: Mutation[];
  sync: { status: SyncStatus; error: string; lastSync: string };
  settings: Settings;
  toast: Toast | null;
}

const SETTINGS_KEY = 'tasklist.settings';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: app still works for this session */
  }
}

function emptyData(): Collections {
  return { tasks: [], completions: [], projects: [], comments: [], members: [], categories: [] };
}

function cacheKey(s: Settings) {
  return 'tasklist.cache.' + (s.apiUrl ? s.apiUrl.slice(-24) : 'demo');
}

function loadCache(s: Settings) {
  return read(cacheKey(s), { data: emptyData(), rev: 0, outbox: [] as Mutation[] });
}

const storedSettings = read<Settings>(SETTINGS_KEY, { apiUrl: '', passcode: '', meId: '', theme: 'system' });
const initialSettings: Settings = { ...storedSettings, apiUrl: storedSettings.apiUrl || DEFAULT_API_URL };
const initialCache = loadCache(initialSettings);

let state: State = {
  ...initialCache,
  data: { ...emptyData(), ...initialCache.data },
  sync: { status: 'idle', error: '', lastSync: '' },
  settings: initialSettings,
  toast: null,
};

const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

function setState(patch: Partial<State>) {
  state = { ...state, ...patch };
  if ('data' in patch || 'rev' in patch || 'outbox' in patch) {
    write(cacheKey(state.settings), { data: state.data, rev: state.rev, outbox: state.outbox });
  }
  listeners.forEach((l) => l());
}

export function useStore(): State {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

// ---------------------------------------------------------------------------
// Backend

let backend: Backend = makeBackend(state.settings);

function makeBackend(s: Settings): Backend {
  return s.apiUrl ? new SheetsBackend(s.apiUrl, s.passcode) : new DemoBackend();
}

export function getBackend(): Backend {
  return backend;
}

export function updateSettings(patch: Partial<Settings>) {
  if (patch.apiUrl !== undefined) patch = { ...patch, apiUrl: patch.apiUrl || DEFAULT_API_URL };
  const settings = { ...state.settings, ...patch };
  write(SETTINGS_KEY, settings);
  const connectionChanged = patch.apiUrl !== undefined && patch.apiUrl !== state.settings.apiUrl;
  const passChanged = patch.passcode !== undefined && patch.passcode !== state.settings.passcode;
  if (connectionChanged) {
    const cache = loadCache(settings);
    state = { ...state, settings, ...cache, data: { ...emptyData(), ...cache.data } };
  } else {
    state = { ...state, settings };
  }
  if (connectionChanged || passChanged) {
    backend = makeBackend(settings);
    setState({ sync: { ...state.sync, status: 'idle', error: '' } });
    void syncNow();
  } else {
    setState({});
  }
}

// ---------------------------------------------------------------------------
// Local writes (optimistic) + outbox

function mergeRows<T extends Row>(rows: T[], incoming: T[], pendingIds: Set<string>): T[] {
  if (!incoming.length) return rows;
  const index = new Map(rows.map((r, i) => [r.id, i]));
  const out = rows.slice();
  for (const r of incoming) {
    const i = index.get(r.id);
    if (i === undefined) {
      index.set(r.id, out.length);
      out.push(r);
    } else if (!pendingIds.has(r.id) && r.updatedAt >= out[i].updatedAt) {
      out[i] = r;
    }
  }
  return out;
}

export function save<C extends CollectionName>(collection: C, record: Collections[C][number]) {
  const rec = { ...record, updatedAt: nowStamp() } as AnyRecord;
  const rows = state.data[collection] as Row[];
  const i = rows.findIndex((r) => r.id === rec.id);
  const nextRows = i === -1 ? [...rows, rec] : rows.map((r, j) => (j === i ? rec : r));
  const outbox = state.outbox.filter((m) => !(m.collection === collection && m.record.id === rec.id));
  outbox.push({ opId: uid('op'), collection, record: rec });
  setState({ data: { ...state.data, [collection]: nextRows }, outbox });
  scheduleFlush();
  return rec as Collections[C][number];
}

export function remove<C extends CollectionName>(collection: C, record: Collections[C][number]) {
  save(collection, { ...record, deleted: true });
}

export function showToast(message: string, undo?: () => void) {
  const toast = { id: Date.now(), message, undo };
  setState({ toast });
  setTimeout(() => {
    if (state.toast?.id === toast.id) setState({ toast: null });
  }, 5000);
}

export function dismissToast() {
  setState({ toast: null });
}

/**
 * Completes a task. Recurring tasks log a completion and roll forward to the
 * next due date; one-off tasks are marked done. Returns an undo function.
 */
export function completeTask(task: Task, by = state.settings.meId || task.assigneeId) {
  const completion: Completion = {
    id: uid('x'),
    taskId: task.id,
    title: task.title,
    completedBy: by || 'both',
    completedAt: nowStamp(),
    dueDate: task.dueDate,
    effort: task.effort,
    categoryId: task.categoryId,
    updatedAt: nowStamp(),
    deleted: false,
  };
  save('completions', completion);
  if (task.recurrence) {
    const next = nextOccurrence(task.recurrence, task.dueDate, today());
    save('tasks', { ...task, dueDate: next, completedAt: completion.completedAt, completedBy: completion.completedBy });
  } else {
    save('tasks', { ...task, status: 'done', completedAt: completion.completedAt, completedBy: completion.completedBy });
  }
  const undo = () => {
    save('tasks', task);
    remove('completions', completion);
  };
  showToast(task.recurrence ? `Done · next due ${nextLabel(task)}` : 'Done', undo);
  return undo;
}

function nextLabel(task: Task) {
  const t = state.data.tasks.find((x) => x.id === task.id);
  return t?.dueDate ? relativeLabel(t.dueDate) : '';
}

export function reopenTask(task: Task) {
  save('tasks', { ...task, status: 'open', completedAt: '', completedBy: '' });
  const last = state.data.completions
    .filter((c) => c.taskId === task.id && !c.deleted)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
  if (last) remove('completions', last);
}

// ---------------------------------------------------------------------------
// Sync

let flushTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleFlush() {
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void syncNow(), 600);
}

let running: Promise<void> | null = null;
let again = false;

export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    do {
      again = false;
      await syncOnce();
    } while (again);
  })().finally(() => {
    running = null;
  });
  return running;
}

async function syncOnce() {
  // Connected to a Sheet but no passcode yet (or a rejected one): wait for the user.
  if (backend.kind === 'sheets' && (!state.settings.passcode || state.sync.status === 'auth')) return;
  const b = backend;
  setState({ sync: { ...state.sync, status: 'syncing' } });
  try {
    const sending = state.outbox.slice();
    if (sending.length) {
      await b.push(sending);
      const sent = new Set(sending.map((m) => m.opId));
      setState({ outbox: state.outbox.filter((m) => !sent.has(m.opId)) });
    }
    const res = await b.pull(state.rev);
    if (b !== backend) return; // connection switched mid-flight
    const pending = new Set(state.outbox.map((m) => m.record.id));
    const data = { ...state.data };
    for (const name of COLLECTIONS) {
      const incoming = res.changes[name];
      if (incoming?.length) (data as any)[name] = mergeRows(data[name] as Row[], incoming as Row[], pending);
    }
    setState({ data, rev: res.rev, sync: { status: 'idle', error: '', lastSync: nowStamp() } });
  } catch (e) {
    if (e instanceof AuthError) {
      setState({ sync: { ...state.sync, status: 'auth', error: e.message } });
    } else if (!navigator.onLine || e instanceof TypeError) {
      setState({ sync: { ...state.sync, status: 'offline', error: '' } });
    } else {
      setState({ sync: { ...state.sync, status: 'error', error: (e as Error).message } });
    }
  }
}

/** Polls while the app is visible; syncs immediately on focus or reconnect. */
export function startSync(intervalMs = 30_000) {
  void syncNow();
  const tick = () => {
    if (document.visibilityState === 'visible') void syncNow();
  };
  const timer = setInterval(tick, intervalMs);
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('online', tick);
  return () => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', tick);
    window.removeEventListener('online', tick);
  };
}

/** Test hook: reset in-memory state to a clean slate. */
export function __resetForTests(settings: Partial<Settings> = {}) {
  state = {
    data: emptyData(),
    rev: 0,
    outbox: [],
    sync: { status: 'idle', error: '', lastSync: '' },
    settings: { apiUrl: '', passcode: '', meId: '', theme: 'system', ...settings },
    toast: null,
  };
  backend = makeBackend(state.settings);
}
