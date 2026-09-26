import { useState } from 'preact/hooks';
import type { Category, Member } from '../api/types';
import { DemoBackend } from '../api/mock';
import { Avatar, Seg } from '../components/common';
import { DemoVideoCard } from '../components/DemoVideo';
import { IconClose, IconPlus } from '../components/icons';
import { MEMBER_COLORS, uid } from '../lib/defaults';
import { activeCategories, activeMembers } from '../store/selectors';
import { planStarterImport } from '../lib/starter';
import { importStarter, remove, save, showToast, syncNow, updateSettings, useStore } from '../store/store';

const SETUP_URL = 'https://github.com/robh0369/TaskList#connect-your-google-sheet';

export function SettingsView() {
  const { data, settings, sync, outbox } = useStore();
  const members = activeMembers(data);
  const categories = activeCategories(data);
  const [url, setUrl] = useState(settings.apiUrl);
  const [pass, setPass] = useState(settings.passcode);

  const connected = !!settings.apiUrl;
  const statusText = {
    idle: sync.lastSync ? `Synced ${new Date(sync.lastSync).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Ready',
    syncing: 'Syncing…',
    offline: 'Offline. Changes will sync when you reconnect.',
    error: `Sync error: ${sync.error}`,
    auth: 'Wrong passcode',
  }[sync.status];

  return (
    <div class="content">
      <section class="section">
        <div class="section-h"><h2>Getting started</h2></div>
        <DemoVideoCard />
      </section>

      <section class="section">
        <div class="section-h"><h2>This device</h2></div>
        <div class="card">
          <div class="field">
            <span class="label">I am</span>
            <div class="chips" style={{ padding: 0, margin: '4px 0 0', flexWrap: 'wrap' }}>
              {members.map((m) => (
                <button key={m.id} class="chip" aria-pressed={settings.meId === m.id} onClick={() => updateSettings({ meId: m.id })}>
                  <Avatar member={m} size="sm" /> {m.name}
                </button>
              ))}
            </div>
          </div>
          <div class="field">
            <span class="label">Appearance</span>
            <Seg label="Theme" value={settings.theme} onChange={(theme) => updateSettings({ theme })} options={[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']]} />
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-h"><h2>Household</h2></div>
        <div class="card">
          {members.map((m) => <MemberRow key={m.id} member={m} canDelete={members.length > 1} />)}
          <button
            class="btn ghost block"
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => save('members', { id: uid('m'), name: 'New person', color: MEMBER_COLORS[members.length % MEMBER_COLORS.length], updatedAt: '', deleted: false })}
          >
            <IconPlus /> Add person
          </button>
        </div>
      </section>

      {planStarterImport(data).tasks.length > 0 && (
        <section class="section">
          <div class="section-h"><h2>Starting list</h2></div>
          <div class="card card-pad">
            <p style={{ margin: '0 0 12px', color: 'var(--text-2)', fontSize: 15 }}>
              Adds the {planStarterImport(data).tasks.length} tasks from Rob &amp; Rebecca's handwritten list, with their priorities and a Hire out category.
              Tasks that are already added are skipped.
            </p>
            <button class="btn primary block" data-testid="import-starter-settings" onClick={() => showToast(`Added ${importStarter()} tasks`)}>
              Load starting list
            </button>
          </div>
        </section>
      )}

      <section class="section">
        <div class="section-h"><h2>Categories</h2></div>
        <div class="card">
          {categories.map((c) => <CategoryRow key={c.id} cat={c} />)}
          <button
            class="btn ghost block"
            style={{ justifyContent: 'flex-start', padding: '12px 16px' }}
            onClick={() => save('categories', { id: uid('c'), name: 'New category', icon: '', sortOrder: categories.length, updatedAt: '', deleted: false })}
          >
            <IconPlus /> Add category
          </button>
        </div>
      </section>

      <section class="section">
        <div class="section-h"><h2>Shared data</h2></div>
        <div class="card">
          <div class="field">
            <span class="label">Status</span>
            <div style={{ fontSize: 15 }}>
              {connected ? 'Google Sheet' : 'Demo mode: data stays in this browser only'}
              <div class="hint" style={{ margin: '2px 0 0' }}>
                {statusText}
                {outbox.length > 0 && ` · ${outbox.length} change${outbox.length > 1 ? 's' : ''} waiting`}
              </div>
            </div>
          </div>
          <label class="field">
            <span class="label">Apps Script web app URL</span>
            <input value={url} onInput={(e) => setUrl(e.currentTarget.value.trim())} placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" spellcheck={false} />
          </label>
          <label class="field">
            <span class="label">Household passcode</span>
            <input type="password" value={pass} onInput={(e) => setPass(e.currentTarget.value)} autoComplete="off" />
          </label>
          <div class="field" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button class="btn primary" disabled={url === settings.apiUrl && pass === settings.passcode} onClick={() => updateSettings({ apiUrl: url, passcode: pass })}>
              {url ? 'Connect' : 'Save'}
            </button>
            <button class="btn" onClick={() => void syncNow()}>Sync now</button>
          </div>
        </div>
        <p class="hint">
          To share tasks between phones, connect a Google Sheet. <a href={SETUP_URL} target="_blank" rel="noopener">Setup guide</a>
        </p>
        {!connected && (
          <button
            class="btn danger block"
            style={{ marginTop: 16 }}
            onClick={() => {
              if (!confirm('Reset demo data back to the sample tasks?')) return;
              DemoBackend.reset();
              localStorage.removeItem('tasklist.cache.demo');
              location.reload();
            }}
          >
            Reset demo data
          </button>
        )}
      </section>
    </div>
  );
}

function MemberRow({ member, canDelete }: { member: Member; canDelete: boolean }) {
  const [name, setName] = useState(member.name);
  const commit = () => name.trim() && name.trim() !== member.name && save('members', { ...member, name: name.trim() });
  return (
    <div class="setting-row" style={{ flexWrap: 'wrap' }}>
      <Avatar member={{ ...member, name }} />
      <input value={name} onInput={(e) => setName(e.currentTarget.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Name" />
      <div class="swatches">
        {MEMBER_COLORS.map((c) => (
          <button key={c} class="swatch" style={{ background: c }} aria-pressed={member.color === c} aria-label={`Color ${c}`} onClick={() => save('members', { ...member, color: c })} />
        ))}
      </div>
      {canDelete && (
        <button class="icon-btn" aria-label={`Remove ${member.name}`} onClick={() => confirm(`Remove ${member.name}? Their tasks will show as unassigned.`) && remove('members', member)}>
          <IconClose />
        </button>
      )}
    </div>
  );
}

function CategoryRow({ cat }: { cat: Category }) {
  const [name, setName] = useState(cat.name);
  const commit = () => {
    if (name.trim() && name.trim() !== cat.name) save('categories', { ...cat, name: name.trim() });
  };
  return (
    <div class="setting-row">
      <input value={name} onInput={(e) => setName(e.currentTarget.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()} aria-label="Category name" />
      <button class="icon-btn" aria-label={`Remove ${cat.name}`} onClick={() => remove('categories', cat)}>
        <IconClose />
      </button>
    </div>
  );
}
