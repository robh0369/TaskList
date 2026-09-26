/**
 * Runs apps-script/Code.gs in Node against in-memory fakes of the Google services
 * it uses, to check the request/response contract the app depends on.
 */
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { blankTask } from '../src/lib/defaults';

class FakeRange {
  constructor(private sheet: FakeSheet, private r: number, private c: number, private nr: number, private nc: number) {}
  getValues() {
    const out: unknown[][] = [];
    for (let i = 0; i < this.nr; i++) {
      const row: unknown[] = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sheet.cells[this.r - 1 + i]?.[this.c - 1 + j] ?? '');
      out.push(row);
    }
    return out;
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setValues(v: unknown[][]) {
    v.forEach((row, i) => {
      const target = (this.sheet.cells[this.r - 1 + i] ??= []);
      row.forEach((cell, j) => (target[this.c - 1 + j] = cell));
    });
    return this;
  }
  setValue(v: unknown) {
    return this.setValues([[v]]);
  }
  setNumberFormat() {
    return this;
  }
  setFontWeight() {
    return this;
  }
}

class FakeSheet {
  cells: unknown[][] = [];
  getLastRow() {
    for (let i = this.cells.length - 1; i >= 0; i--) if (this.cells[i]?.some((c) => c !== '' && c !== undefined)) return i + 1;
    return 0;
  }
  getLastColumn() {
    return Math.max(0, ...this.cells.map((r) => r.length));
  }
  getMaxRows() {
    return 1000;
  }
  getRange(r: number, c: number, nr = 1, nc = 1) {
    return new FakeRange(this, r, c, nr, nc);
  }
  setFrozenRows() {}
}

function loadScript() {
  const sheets = new Map<string, FakeSheet>();
  const props = new Map<string, string>();
  const cache = new Map<string, string>();
  const globals = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n: string) => sheets.get(n) ?? null,
        insertSheet: (n: string) => {
          const s = new FakeSheet();
          sheets.set(n, s);
          return s;
        },
        getSpreadsheetTimeZone: () => 'UTC',
      }),
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cache.get(k) ?? null, put: (k: string, v: string) => cache.set(k, v) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (s: string) => ({ body: s, setMimeType() { return this; } }),
    },
    Utilities: {
      base64Decode: (s: string) => Array.from(Buffer.from(s, 'base64')),
      newBlob: (bytes: number[]) => ({ bytes }),
      formatDate: (d: Date) => d.toISOString().slice(0, 10),
    },
    Logger: { log() {} },
  };
  const src = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
  const factory = new Function(...Object.keys(globals), src + '\nreturn { doPost, doGet };');
  const api = factory(...Object.values(globals)) as { doPost: (e: unknown) => { body: string }; doGet: () => { body: string } };
  const call = (body: unknown) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(body) } }).body);
  return { call, sheets, props, api };
}

let env: ReturnType<typeof loadScript>;
beforeEach(() => {
  env = loadScript();
  env.props.set('PASSCODE', 'secret');
});

describe('Code.gs', () => {
  it('rejects a wrong passcode', () => {
    expect(env.call({ action: 'pull', passcode: 'nope', since: 0 })).toEqual({ ok: false, error: 'unauthorized' });
  });

  it('explains when no passcode is configured', () => {
    env.props.delete('PASSCODE');
    expect(env.call({ action: 'pull', passcode: '', since: 0 }).error).toMatch(/PASSCODE/);
  });

  it('creates tabs with seed members and categories on first pull', () => {
    const r = env.call({ action: 'pull', passcode: 'secret', since: 0 });
    expect(r.ok).toBe(true);
    expect([...env.sheets.keys()].sort()).toEqual(['Categories', 'Comments', 'Completions', 'Members', 'Projects', 'Tasks']);
    expect(r.changes.members).toHaveLength(2);
    expect(r.changes.categories).toHaveLength(9);
    expect(r.changes.categories[0]).toMatchObject({ id: 'c1', name: 'Kitchen', sortOrder: 0, deleted: false });
  });

  it('round-trips a task with types intact and supports incremental pulls', () => {
    const first = env.call({ action: 'pull', passcode: 'secret', since: 0 });
    const task = blankTask({ title: 'Mow', dueDate: '2026-10-02', effort: 3, recurrence: { freq: 'weekly', interval: 2, mode: 'fixed' } });
    const push = env.call({ action: 'push', passcode: 'secret', mutations: [{ opId: '1', collection: 'tasks', record: task }] });
    expect(push.rev).toBe(first.rev + 1);

    const inc = env.call({ action: 'pull', passcode: 'secret', since: first.rev });
    expect(Object.keys(inc.changes)).toEqual(['tasks']);
    const got = inc.changes.tasks[0];
    expect(got).toMatchObject({ id: task.id, title: 'Mow', dueDate: '2026-10-02', effort: 3, deleted: false, status: 'open' });
    expect(got.recurrence).toEqual(task.recurrence);
    expect(got._rev).toBe(push.rev);

    // Nothing new → empty changes (fast path).
    expect(env.call({ action: 'pull', passcode: 'secret', since: push.rev }).changes).toEqual({});
  });

  it('updates in place with last-write-wins', () => {
    env.call({ action: 'pull', passcode: 'secret', since: 0 });
    const t = blankTask({ title: 'A', updatedAt: '2026-09-26T10:00:00.000Z' });
    env.call({ action: 'push', passcode: 'secret', mutations: [{ opId: '1', collection: 'tasks', record: t }] });
    env.call({ action: 'push', passcode: 'secret', mutations: [{ opId: '2', collection: 'tasks', record: { ...t, title: 'B', updatedAt: '2026-09-26T11:00:00.000Z' } }] });
    env.call({ action: 'push', passcode: 'secret', mutations: [{ opId: '3', collection: 'tasks', record: { ...t, title: 'old', updatedAt: '2026-09-26T09:00:00.000Z' } }] });
    const all = env.call({ action: 'pull', passcode: 'secret', since: 0 }).changes.tasks;
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('B');
    expect(env.sheets.get('Tasks')!.getLastRow()).toBe(2);
  });

  it('has no photo upload (Drive is not used)', () => {
    env.call({ action: 'pull', passcode: 'secret', since: 0 });
    expect(env.call({ action: 'uploadPhoto', passcode: 'secret', dataUrl: 'x' })).toEqual({ ok: false, error: 'unknown action' });
  });

  it('doGet responds so the URL can be checked in a browser', () => {
    expect(JSON.parse(env.api.doGet().body).ok).toBe(true);
  });
});
