import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { Member } from '../api/types';
import { dismissToast, useStore } from '../store/store';
import { IconClose } from './icons';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ member, size }: { member?: Member; size?: 'sm' }) {
  if (!member) return <span class={`avatar none ${size ?? ''}`} aria-label="Unassigned">?</span>;
  return (
    <span class={`avatar ${size ?? ''}`} style={{ background: member.color }} title={member.name} aria-label={member.name}>
      {initials(member.name)}
    </span>
  );
}

export function AssigneeAvatar({ assigneeId, members, size }: { assigneeId: string; members: Member[]; size?: 'sm' }) {
  if (assigneeId === 'both') {
    return (
      <span class="avatar-both" aria-label="Both" title="Both">
        {members.slice(0, 2).map((m) => (
          <Avatar key={m.id} member={m} size={size} />
        ))}
      </span>
    );
  }
  return <Avatar member={members.find((m) => m.id === assigneeId)} size={size} />;
}

export function Sheet({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ComponentChildren; actions?: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);
  return (
    <>
      <div class="scrim" onClick={onClose} />
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div class="sheet-grab" />
        <div class="sheet-head">
          <button class="icon-btn" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
          <h3>{title}</h3>
          <div style={{ minWidth: 44, display: 'flex', justifyContent: 'flex-end' }}>{actions}</div>
        </div>
        {children}
      </div>
    </>
  );
}

export function Seg<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div class="seg" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} aria-pressed={v === value} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

export function ToastHost() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div class="toast" role="status">
      <span>{toast.message}</span>
      {toast.undo && (
        <button
          onClick={() => {
            toast.undo!();
            dismissToast();
          }}
        >
          Undo
        </button>
      )}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ComponentChildren }) {
  return (
    <div class="empty">
      <div class="big" aria-hidden="true">
        {icon}
      </div>
      <strong>{title}</strong>
      {children}
    </div>
  );
}
