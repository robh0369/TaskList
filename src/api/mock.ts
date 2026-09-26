import { demoSeed } from '../lib/defaults';
import type { AnyRecord, Backend, Collections, Mutation, Row, SyncResult } from './types';
import { COLLECTIONS } from './types';

const DB_KEY = 'tasklist.demo.db';
const PHOTO_KEY = 'tasklist.demo.photo.';

interface DemoDb {
  rev: number;
  data: Collections;
}

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* fall through to seed */
  }
  const data = demoSeed();
  let rev = 0;
  for (const name of COLLECTIONS) for (const r of data[name] as Row[]) r._rev = ++rev;
  const db = { rev, data };
  save(db);
  return db;
}

function save(db: DemoDb) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: demo keeps working in memory */
  }
}

function changesSince(db: DemoDb, since: number): SyncResult {
  const changes: Partial<Collections> = {};
  for (const name of COLLECTIONS) {
    const rows = (db.data[name] as Row[]).filter((r) => (r._rev ?? 0) > since);
    if (rows.length) (changes as any)[name] = rows;
  }
  return { rev: db.rev, changes };
}

/** Applies one upsert with last-write-wins on updatedAt. Shared shape with Code.gs. */
export function applyMutation(rows: Row[], record: Row, rev: number): Row[] {
  const i = rows.findIndex((r) => r.id === record.id);
  const next = { ...record, _rev: rev };
  if (i === -1) return [...rows, next];
  if (rows[i].updatedAt > record.updatedAt) return rows;
  const copy = rows.slice();
  copy[i] = next;
  return copy;
}

/** Runs entirely in this browser. Used when no Google Sheet is connected, and by tests. */
export class DemoBackend implements Backend {
  readonly kind = 'demo' as const;

  async pull(since: number): Promise<SyncResult> {
    return changesSince(load(), since);
  }

  async push(mutations: Mutation[]): Promise<SyncResult> {
    const db = load();
    for (const m of mutations) {
      db.rev++;
      (db.data as any)[m.collection] = applyMutation(db.data[m.collection] as Row[], m.record as AnyRecord, db.rev);
    }
    save(db);
    return { rev: db.rev, changes: {} };
  }

  async uploadPhoto(dataUrl: string): Promise<{ fileId: string; url: string }> {
    const fileId = 'demo-' + Date.now().toString(36);
    try {
      localStorage.setItem(PHOTO_KEY + fileId, dataUrl);
    } catch {
      /* too big for demo storage; the photo just won't persist */
    }
    return { fileId, url: dataUrl };
  }

  photoUrl(fileId: string): string {
    try {
      return localStorage.getItem(PHOTO_KEY + fileId) ?? '';
    } catch {
      return '';
    }
  }

  static reset() {
    try {
      localStorage.removeItem(DB_KEY);
    } catch {
      /* ignore */
    }
  }
}
