import { useEffect, useRef, useState } from 'react';
import { handleModalTab } from '../lib/focus.js';

const Arrow = ({ direction = 'diagonal' }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    {direction === 'down' ? (
      <path d="M10 2v15M4 11l6 6 6-6" />
    ) : direction === 'right' ? (
      <path d="M2 10h15M11 4l6 6-6 6" />
    ) : (
      <path d="M4 16 16 4M6 4h10v10" />
    )}
  </svg>
);

const SoundIcon = ({ active }) => (
  <span className={`sound-icon ${active ? 'is-active' : ''}`} aria-hidden="true">
    {[0, 1, 2, 3].map((bar) => (
      <i key={bar} />
    ))}
  </span>
);

export function SiteHeader({
  brand,
  nav,
  soundEnabled,
  onToggleSound,
  onOpenMenu,
  menuOpen,
}) {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label={`${brand.name} home`}>
        <span className="brand-mark">{brand.mark}</span>
        <span className="brand-copy">
          <strong>{brand.name}</strong>
          <small>{brand.descriptor}</small>
        </span>
      </a>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {nav.map((item) => (
          <a href={item.href} key={item.href}>
            <span>{item.index}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <div className="header-controls">
        <button
          className="sound-toggle"
          type="button"
          aria-label={soundEnabled ? 'Sound on' : 'Sound off'}
          aria-pressed={soundEnabled}
          onClick={onToggleSound}
        >
          <SoundIcon active={soundEnabled} />
          <span>{soundEnabled ? 'Sound on' : 'Sound off'}</span>
        </button>
        <button
          className="menu-button"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={onOpenMenu}
        >
          <span>Menu</span>
          <i />
          <i />
        </button>
      </div>
    </header>
  );
}

export function SceneHud({ scene, availability }) {
  const labels = {
    hero: 'Entry',
    work: 'Transmissions',
    studio: 'Practice',
    contact: 'Signal',
  };
  const indices = { hero: '00', work: '01', studio: '02', contact: '03' };

  return (
    <aside className="scene-hud" aria-label="Scene status">
      <span className="scene-counter">
        {indices[scene]} <i>/</i> 03
      </span>
      <span className="scene-name">{labels[scene]}</span>
      <span className="hud-status">
        <i />
        {availability}
      </span>
    </aside>
  );
}

export function IntroLoader({
  duration,
  onSkip,
  brand = {
    name: 'WEN/JUN',
    descriptor: 'Independent creative practice',
  },
}) {
  const [count, setCount] = useState(0);
  const [brandLead, brandTail = ''] = String(brand.name).split('/');

  useEffect(() => {
    const startedAt = performance.now();
    let frame;

    const tick = (time) => {
      const next = Math.min(100, Math.round(((time - startedAt) / duration) * 100));
      setCount(next);
      if (next < 100) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration]);

  return (
    <div
      className="intro-loader"
      style={{ '--intro-duration': `${duration}ms` }}
      role="status"
      aria-live="off"
      aria-label="Loading experience"
    >
      <div className="intro-loader-grid" aria-hidden="true" />
      <div className="intro-loader-field" aria-hidden="true">
        <span className="intro-loader-seed" />
        <span className="intro-loader-seam" />
        <i className="intro-loader-filament intro-loader-filament-a" />
        <i className="intro-loader-filament intro-loader-filament-b" />
        <i className="intro-loader-ring intro-loader-ring-a" />
        <i className="intro-loader-ring intro-loader-ring-b" />
        <i className="intro-loader-ring intro-loader-ring-c" />
        <span className="intro-loader-x">
          <i />
          <i />
        </span>
      </div>
      <div className="intro-loader-brand-handoff" aria-hidden="true">
        <span>
          {brandLead}<i>/</i>{brandTail}
        </span>
        <small>{brand.descriptor}</small>
      </div>
      <div className="intro-loader-phase">
        <span>Spatial assembly</span>
        <span>Core / Field / Form</span>
      </div>
      <div className="intro-loader-readout">
        <span>Assembling world</span>
        <strong aria-hidden="true">{String(count).padStart(3, '0')}</strong>
      </div>
      <button className="intro-skip" type="button" onClick={onSkip}>
        Skip intro
        <Arrow direction="right" />
      </button>
      <span className="intro-coordinate">31°14′N / 121°28′E</span>
    </div>
  );
}

export function MenuOverlay({ open, brand, nav, contact, onClose }) {
  const closeRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 30);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      handleModalTab(overlayRef.current, event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div
      ref={overlayRef}
      className={`menu-overlay ${open ? 'is-open' : ''}`}
      id="site-menu"
      aria-hidden={!open}
    >
      <div className="menu-topline">
        <span>{brand.name} / Index</span>
        <button ref={closeRef} type="button" onClick={onClose}>
          Close <i aria-hidden="true">×</i>
        </button>
      </div>

      <nav className="menu-links" aria-label="Expanded navigation">
        {nav.map((item) => (
          <a href={item.href} key={item.href} onClick={onClose}>
            <span>{item.index}</span>
            <strong>{item.label}</strong>
            <Arrow />
          </a>
        ))}
      </nav>

      <div className="menu-footer">
        <div>
          <span>New business</span>
          <a href={`mailto:${contact.email}`}>{contact.email}</a>
        </div>
        <div>
          <span>Find us</span>
          <p>{contact.location}</p>
        </div>
        <p className="menu-manifesto">
          Strategy, design, motion and code for worlds that deserve to be felt.
        </p>
      </div>
    </div>
  );
}

export function ProjectDialog({ project, index, total, onClose, onNext }) {
  const closeRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!project) return undefined;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
      handleModalTab(dialogRef.current, event);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [project, onClose]);

  if (!project) return null;

  return (
    <div
      ref={dialogRef}
      className="project-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-dialog-title"
    >
      <div
        className={`project-dialog-art ${project.image ? 'has-image' : ''}`}
        style={{ '--project-accent': project.accent }}
        aria-hidden="true"
      >
        {project.image ? <img src={project.image} alt="" /> : <span />}
      </div>
      <div className="project-dialog-panel">
        <div className="dialog-topline">
          <span>
            Project {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
          <button ref={closeRef} type="button" onClick={onClose}>
            Close <i aria-hidden="true">×</i>
          </button>
        </div>
        <div className="dialog-copy">
          <span className="dialog-category">{project.category}</span>
          <h2 id="project-dialog-title">{project.title}</h2>
          <p>{project.summary}</p>
          <dl>
            <div>
              <dt>Client</dt>
              <dd>{project.client}</dd>
            </div>
            <div>
              <dt>Year</dt>
              <dd>{project.year}</dd>
            </div>
            <div>
              <dt>Scope</dt>
              <dd>{project.services.join(' / ')}</dd>
            </div>
          </dl>
        </div>
        <button className="next-project" type="button" onClick={onNext}>
          <span>Next transmission</span>
          <Arrow direction="right" />
        </button>
      </div>
    </div>
  );
}
