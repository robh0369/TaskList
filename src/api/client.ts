import type { Backend, Mutation, SyncResult } from './types';
import { AuthError } from './types';

/**
 * Talks to the Apps Script web app (apps-script/Code.gs).
 *
 * Requests are POSTs with a text/plain body: that's a "simple" CORS request, so
 * the browser skips the preflight that Apps Script can't answer. Apps Script
 * replies via a redirect to googleusercontent.com, which fetch follows.
 */
export class SheetsBackend implements Backend {
  readonly kind = 'sheets' as const;

  constructor(
    private url: string,
    private passcode: string,
  ) {}

  private async call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, passcode: this.passcode, ...payload }),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    const text = await res.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error('Unexpected response. Check the web app URL and that it is deployed for "Anyone".');
    }
    if (!body.ok) {
      if (body.error === 'unauthorized') throw new AuthError('Wrong passcode');
      throw new Error(body.error || 'Request failed');
    }
    return body as T;
  }

  pull(since: number): Promise<SyncResult> {
    return this.call<SyncResult>('pull', { since });
  }

  push(mutations: Mutation[]): Promise<SyncResult> {
    return this.call<SyncResult>('push', { mutations });
  }
}
