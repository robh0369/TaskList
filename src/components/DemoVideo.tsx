import { useEffect, useRef, useState } from 'preact/hooks';
import { IconChevron, IconClose, IconPlay } from './icons';

const SRC = `${import.meta.env.BASE_URL}demo/tasklist-demo.mp4`;
const POSTER = `${import.meta.env.BASE_URL}demo/poster.jpg`;
const THUMB = `${import.meta.env.BASE_URL}icons/icon-192.png`;

/** Settings card that opens the 45-second highlight video full screen. */
export function DemoVideoCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button class="card demo-card" data-testid="demo-video" onClick={() => setOpen(true)}>
        <span class="demo-thumb" style={{ backgroundImage: `url(${THUMB})` }}>
          <span class="demo-play"><IconPlay /></span>
        </span>
        <span class="demo-text">
          <span class="demo-title">Demo Video</span>
          <span class="demo-sub">See how TaskList works · 45 sec</span>
        </span>
        <IconChevron class="demo-chev" />
      </button>
      {open && <DemoPlayer onClose={() => setOpen(false)} />}
    </>
  );
}

function DemoPlayer({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Opened by a tap, so playing with sound is allowed; fall back to muted if not.
    video.current?.play().catch(() => {
      if (!video.current) return;
      video.current.muted = true;
      void video.current.play().catch(() => {});
    });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, []);
  return (
    <div class="demo-player" role="dialog" aria-modal="true" aria-label="Demo Video" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <video ref={video} src={SRC} poster={POSTER} controls playsInline preload="auto" onEnded={onClose} />
      <button class="icon-btn demo-close" onClick={onClose} aria-label="Close video">
        <IconClose />
      </button>
    </div>
  );
}
