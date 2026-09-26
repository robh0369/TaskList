import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Task } from './api/types';
import { Avatar, ToastHost } from './components/common';
import { IconBack, IconChart, IconCheckCircle, IconGear, IconList, IconLock, IconPlus, Logo } from './components/icons';
import { TaskSheet } from './components/TaskSheet';
import { activeMembers } from './store/selectors';
import { startSync, syncNow, updateSettings, useStore } from './store/store';
import { ReportsView } from './views/Reports';
import { SettingsView } from './views/Settings';
import { TasksView } from './views/Tasks';
import { DoneView } from './views/Done';

type Route = { name: 'tasks' | 'done' | 'reports' | 'settings' };

function parseHash(): Route {
  const [, a] = location.hash.replace(/^#/, '').split('/');
  if (a === 'done' || a === 'reports' || a === 'settings') return { name: a };
  return { name: 'tasks' };
}

function go(path: string) {
  location.hash = '#/' + path;
}

const TABS = [
  { name: 'tasks', label: 'Tasks', Icon: IconList },
  { name: 'done', label: 'Done', Icon: IconCheckCircle },
  { name: 'reports', label: 'Reports', Icon: IconChart },
] as const;

function PasscodeScreen({ rejected }: { rejected: boolean }) {
  const [code, setCode] = useState('');
  const submit = (e: Event) => {
    e.preventDefault();
    if (code.trim()) updateSettings({ passcode: code.trim() });
  };
  return (
    <form class="onboard" onSubmit={submit}>
      <div class="onboard-mark"><IconLock /></div>
      <h1>Household passcode</h1>
      <p>Enter the passcode you set in the Google Sheet's script. You only need to do this once on each phone.</p>
      <div class="card" style={{ marginTop: 20 }}>
        <label class="field">
          <span class="label">Passcode</span>
          <input
            type="password"
            value={code}
            onInput={(e) => setCode(e.currentTarget.value)}
            autoFocus
            autoComplete="current-password"
            aria-label="Passcode"
            data-testid="passcode"
          />
        </label>
      </div>
      {rejected && <p class="error-text">That passcode didn't match. Try again.</p>}
      <button class="btn primary block" style={{ marginTop: 16 }} type="submit" disabled={!code.trim()}>
        Connect
      </button>
    </form>
  );
}

export function App() {
  const state = useStore();
  const { data, settings, sync } = state;
  const [route, setRoute] = useState<Route>(parseHash);
  const [sheet, setSheet] = useState<{ task?: Task; defaults?: Partial<Task> } | null>(null);

  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  useEffect(() => startSync(), []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const openTask = useCallback((task: Task) => setSheet({ task }), []);
  const members = activeMembers(data);
  const me = members.find((m) => m.id === settings.meId);

  // Connected to the household Sheet: get the passcode once per device.
  if (settings.apiUrl && (!settings.passcode || sync.status === 'auth')) {
    return <PasscodeScreen rejected={!!settings.passcode && sync.status === 'auth'} />;
  }

  // First sync hasn't landed yet.
  if (settings.apiUrl && state.rev === 0) {
    const failed = sync.status === 'error' || sync.status === 'offline';
    return (
      <div class="onboard">
        <Logo size={48} />
        <h1>{failed ? "Couldn't connect" : 'Connecting…'}</h1>
        <p>
          {sync.status === 'offline'
            ? 'No connection to your Google Sheet. Check your internet connection.'
            : failed
              ? sync.error
              : 'Loading your household tasks from Google Sheets.'}
        </p>
        {failed && (
          <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
            <button class="btn primary" onClick={() => void syncNow()}>Try again</button>
            <button class="btn" onClick={() => updateSettings({ passcode: '' })}>Re-enter passcode</button>
          </div>
        )}
      </div>
    );
  }

  // First run on this device: ask who's using it.
  if (!settings.meId && members.length > 0) {
    return (
      <div class="onboard">
        <Logo size={48} />
        <h1>Who's this phone for?</h1>
        <p>Your tasks show up first on the Today screen, and anything you complete gets credited to you. You can change this later in Settings.</p>
        <div class="who-pick">
          {members.map((m) => (
            <button key={m.id} onClick={() => updateSettings({ meId: m.id })}>
              <Avatar member={m} /> {m.name}
            </button>
          ))}
        </div>
        <p class="hint" style={{ marginTop: 20 }}>Names are placeholders? Pick one, then rename both of you in Settings.</p>
      </div>
    );
  }

  const title =
    { tasks: 'Tasks', done: 'Done', reports: 'Reports', settings: 'Settings' }[route.name];
  const subtitle =
    route.name === 'tasks'
      ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      : '';
  const tabActive = route.name;

  return (
    <div class="app">
      <header class="topbar">
        {route.name === 'settings' && (
          <button class="icon-btn" aria-label="Back" onClick={() => (history.length > 1 ? history.back() : go('tasks'))} style={{ marginLeft: -10 }}>
            <IconBack />
          </button>
        )}
        <h1>
          {subtitle && <span class="sub">{subtitle}</span>}
          {title}
        </h1>
        <button class="sync-dot" data-s={sync.status} onClick={() => void syncNow()} aria-label={`Sync status: ${sync.status}. Tap to sync.`}>
          <i />
        </button>
        {route.name !== 'settings' && (
          <button class="icon-btn" aria-label="Settings" onClick={() => go('settings')} style={{ marginRight: -8 }}>
            {me ? <Avatar member={me} /> : <IconGear />}
          </button>
        )}
      </header>

      {sync.status === 'auth' && (
        <div class="content" style={{ paddingBottom: 0 }}>
          <div class="banner danger">
            The household passcode was rejected.
            <button class="btn" onClick={() => go('settings')}>Fix</button>
          </div>
        </div>
      )}
      {!settings.apiUrl && route.name === 'tasks' && (
        <div class="content" style={{ paddingBottom: 0 }}>
          <div class="banner">
            <span>Demo mode. Tasks are saved on this device only.</span>
            <button class="btn" onClick={() => go('settings')}>Connect</button>
          </div>
        </div>
      )}

      <main>
        {route.name === 'tasks' && <TasksView onOpen={openTask} />}
        {route.name === 'done' && <DoneView onOpen={openTask} />}
        {route.name === 'reports' && <ReportsView onOpen={openTask} />}
        {route.name === 'settings' && <SettingsView />}
      </main>

      {route.name !== 'settings' && (
        <button
          class="fab"
          aria-label="New task"
          data-testid="fab"
          onClick={() => setSheet({})}
        >
          <IconPlus />
        </button>
      )}

      <nav class="tabbar" aria-label="Main">
        <div class="tabbar-inner">
          {TABS.map(({ name, label, Icon }) => (
            <button key={name} class="tab" aria-current={tabActive === name ? 'page' : undefined} onClick={() => go(name)}>
              <Icon />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {sheet && <TaskSheet task={sheet.task} defaults={sheet.defaults} onClose={() => setSheet(null)} />}
      <ToastHost />
    </div>
  );
}
