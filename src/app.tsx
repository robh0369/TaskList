import { useCallback, useEffect, useState } from 'preact/hooks';
import type { Task } from './api/types';
import { Avatar, ToastHost } from './components/common';
import { IconBack, IconChart, IconFolder, IconGear, IconList, IconPlus, IconToday } from './components/icons';
import { TaskSheet } from './components/TaskSheet';
import { activeMembers } from './store/selectors';
import { startSync, syncNow, updateSettings, useStore } from './store/store';
import { ProjectDetail, ProjectsView } from './views/Projects';
import { ReportsView } from './views/Reports';
import { SettingsView } from './views/Settings';
import { TasksView } from './views/Tasks';
import { TodayView } from './views/Today';

type Route = { name: 'today' | 'tasks' | 'projects' | 'reports' | 'settings' } | { name: 'project'; id: string };

function parseHash(): Route {
  const [, a, b] = location.hash.replace(/^#/, '').split('/');
  if (a === 'projects' && b) return { name: 'project', id: decodeURIComponent(b) };
  if (a === 'tasks' || a === 'projects' || a === 'reports' || a === 'settings') return { name: a };
  return { name: 'today' };
}

function go(path: string) {
  location.hash = '#/' + path;
}

const TABS = [
  { name: 'today', label: 'Today', Icon: IconToday },
  { name: 'tasks', label: 'Tasks', Icon: IconList },
  { name: 'projects', label: 'Projects', Icon: IconFolder },
  { name: 'reports', label: 'Reports', Icon: IconChart },
] as const;

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

  // First run on this device: ask who's using it.
  if (!settings.meId && members.length > 0) {
    return (
      <div class="onboard">
        <div style={{ fontSize: 48 }} aria-hidden="true">🏡</div>
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
    route.name === 'project'
      ? data.projects.find((p) => p.id === route.id)?.name ?? 'Project'
      : { today: 'Today', tasks: 'All tasks', projects: 'Projects', reports: 'Reports', settings: 'Settings' }[route.name];
  const subtitle =
    route.name === 'today'
      ? new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
      : '';
  const tabActive = route.name === 'project' ? 'projects' : route.name;

  return (
    <div class="app">
      <header class="topbar">
        {(route.name === 'project' || route.name === 'settings') && (
          <button class="icon-btn" aria-label="Back" onClick={() => history.length > 1 ? history.back() : go(route.name === 'project' ? 'projects' : 'today')} style={{ marginLeft: -10 }}>
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
      {!settings.apiUrl && route.name === 'today' && (
        <div class="content" style={{ paddingBottom: 0 }}>
          <div class="banner">
            <span>Demo mode. Tasks are saved on this device only.</span>
            <button class="btn" onClick={() => go('settings')}>Connect</button>
          </div>
        </div>
      )}

      <main>
        {route.name === 'today' && <TodayView onOpen={openTask} />}
        {route.name === 'tasks' && <TasksView onOpen={openTask} />}
        {route.name === 'projects' && <ProjectsView onOpenProject={(id) => go('projects/' + encodeURIComponent(id))} />}
        {route.name === 'project' && (
          <ProjectDetail id={route.id} onOpen={openTask} onAdd={(defaults) => setSheet({ defaults })} onBack={() => go('projects')} />
        )}
        {route.name === 'reports' && <ReportsView onOpen={openTask} />}
        {route.name === 'settings' && <SettingsView />}
      </main>

      {route.name !== 'settings' && (
        <button
          class="fab"
          aria-label="New task"
          data-testid="fab"
          onClick={() => setSheet({ defaults: route.name === 'project' ? { projectId: route.id } : undefined })}
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
