import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  IntroLoader,
  MenuOverlay,
  ProjectDialog,
  SceneHud,
  SiteHeader,
} from './components/Interface.jsx';
import RippleText from './components/RippleText.jsx';
import SideRays from './components/SideRays.jsx';
import StudioWaveTitle from './components/StudioWaveTitle.jsx';
import WorkTitle from './components/WorkTitle.jsx';
import { studioConfig } from './data/studio.js';
import { useSceneProgress } from './hooks/useSceneProgress.js';
import { useWorkTitleReveal } from './hooks/useWorkTitleReveal.js';
import { destroyAmbientAudio, toggleAmbientAudio } from './lib/audio.js';
import { copyText } from './lib/clipboard.js';
import { getIntroDuration } from './lib/intro.js';
import { mapRange, normaliseProjects } from './lib/story.js';

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

const ExperienceCanvas = lazy(() => import('./components/ExperienceCanvas.jsx'));
const HalftoneReveal = lazy(() => import('./components/HalftoneReveal.jsx'));
const PixelSnow = lazy(() => import('./components/PixelSnow.jsx'));
const DotGrid = lazy(() => import('./components/DotGrid.jsx'));
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

function App() {
  const config = studioConfig;
  const projects = useMemo(() => normaliseProjects(config.projects), [config.projects]);
  const { progress, scene } = useSceneProgress();
  const reducedMotion = useReducedMotion();
  const [introVisible, setIntroVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [rippleTitleReady, setRippleTitleReady] = useState(false);
  const { ref: workTitleRef, revealed: workTitleRevealed } =
    useWorkTitleReveal({
      enabled: !introVisible,
      reducedMotion,
    });
  const dialogTriggerRef = useRef(null);
  const audioStateRef = useRef({ active: false });
  const audioStartingRef = useRef(false);
  const autoplayPendingRef = useRef(true);
  const voiceAudioRef = useRef(null);
  const copiedTimerRef = useRef(0);
  const introStartedAtRef = useRef(performance.now());
  const introDuration = useMemo(
    () =>
      getIntroDuration(
        window.matchMedia('(max-width: 720px)').matches,
        reducedMotion,
        config.settings.introDuration,
      ),
    [config.settings.introDuration, reducedMotion],
  );

  const sceneStyle = useMemo(
    () => ({
      '--background': config.theme.background,
      '--foreground': config.theme.foreground,
      '--muted': config.theme.muted,
      '--accent': config.theme.accent,
      '--secondary': config.theme.secondary,
    }),
    [config.theme],
  );

  const activeProjectIndex = projects.length
    ? Math.min(
        projects.length - 1,
        Math.max(0, Math.floor(mapRange(progress, 0.25, 0.54, 0, projects.length))),
      )
    : 0;

  const finishIntro = useCallback(() => {
    setIntroVisible(false);
  }, []);

  useEffect(() => {
    document.title = config.brand.metaTitle;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', config.brand.metaDescription);
  }, [config.brand]);

  useEffect(
    () => () => {
      window.clearTimeout(copiedTimerRef.current);
      destroyAmbientAudio(audioStateRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!introVisible) return undefined;
    if (reducedMotion) {
      finishIntro();
      return undefined;
    }
    const timer = window.setTimeout(finishIntro, introDuration);
    return () => window.clearTimeout(timer);
  }, [finishIntro, introDuration, introVisible, reducedMotion]);

  useEffect(() => {
    document.body.classList.toggle(
      'is-overlay-open',
      menuOpen || selectedIndex !== null || introVisible,
    );
    return () => document.body.classList.remove('is-overlay-open');
  }, [introVisible, menuOpen, selectedIndex]);

  const openProject = (index, trigger) => {
    dialogTriggerRef.current = trigger ?? document.activeElement;
    setSelectedIndex(index);
  };

  const closeProject = useCallback(() => {
    setSelectedIndex(null);
    window.setTimeout(() => {
      if (dialogTriggerRef.current instanceof HTMLElement) {
        dialogTriggerRef.current.focus();
      }
    }, 0);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    window.setTimeout(() => {
      document.querySelector('.menu-button')?.focus();
    }, 0);
  }, []);

  const handleRippleReady = useCallback(() => {
    setRippleTitleReady(true);
  }, []);

  const setAmbientSound = useCallback(async (nextEnabled) => {
    if (nextEnabled && audioStartingRef.current) return false;
    audioStartingRef.current = true;
    try {
      const nextState = await toggleAmbientAudio(
        audioStateRef.current,
        nextEnabled,
        voiceAudioRef.current,
      );
      audioStateRef.current = nextState;
      setSoundEnabled(Boolean(nextState.active));
      if (nextState.active || !nextEnabled) {
        autoplayPendingRef.current = false;
      }
      return Boolean(nextState.active);
    } finally {
      audioStartingRef.current = false;
    }
  }, []);

  const toggleSound = useCallback(async () => {
    await setAmbientSound(!soundEnabled);
  }, [setAmbientSound, soundEnabled]);

  useEffect(() => {
    setAmbientSound(true);

    const resumeOnGesture = (event) => {
      if (!autoplayPendingRef.current) return;
      if (event.target instanceof Element && event.target.closest('.sound-toggle')) {
        return;
      }
      setAmbientSound(true);
    };
    const resumeWhenVisible = () => {
      if (!document.hidden && autoplayPendingRef.current) {
        setAmbientSound(true);
      }
    };

    window.addEventListener('pointerdown', resumeOnGesture, { passive: true });
    window.addEventListener('touchstart', resumeOnGesture, { passive: true });
    window.addEventListener('keydown', resumeOnGesture);
    document.addEventListener('visibilitychange', resumeWhenVisible);

    return () => {
      window.removeEventListener('pointerdown', resumeOnGesture);
      window.removeEventListener('touchstart', resumeOnGesture);
      window.removeEventListener('keydown', resumeOnGesture);
      document.removeEventListener('visibilitychange', resumeWhenVisible);
    };
  }, [setAmbientSound]);

  useEffect(() => {
    if (!introVisible && autoplayPendingRef.current) {
      setAmbientSound(true);
    }
  }, [introVisible, setAmbientSound]);

  const nextProject = useCallback(() => {
    setSelectedIndex((current) => {
      if (current === null || projects.length === 0) return null;
      return (current + 1) % projects.length;
    });
  }, [projects.length]);

  const selectedProject = selectedIndex === null ? null : projects[selectedIndex] ?? null;

  const handleContactEmail = async (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey) return;
    const copied = await copyText(config.contact.email);
    if (!copied) return;
    event.preventDefault();
    setEmailCopied(true);
    window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setEmailCopied(false), 1600);
  };

  return (
    <div
      className={`site ${introVisible ? '' : 'is-entered'}`}
      data-scene={scene}
      style={sceneStyle}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <div className="experience-backdrop" aria-hidden="true">
        <span className="aurora aurora-one" />
        <span className="aurora aurora-two" />
        <span className="beacon-fallback">
          <i />
          <i />
          <b />
        </span>
        <span className="particle-haze" />
      </div>
      <SideRays
        rayColor1="#FFC46B"
        rayColor2="#96c8ff"
        origin="top-right"
        speed={2.5}
        intensity={2}
        spread={2}
        density={5}
        followMouse
        className="background-side-rays"
      />
      <div className="pixel-snow-layer" aria-hidden="true">
        <Suspense fallback={null}>
          <PixelSnow
            color="#ffffff"
            variant="snowflake"
            density={0.9}
            speed={1.35}
            wind={0.1}
            flakeSize={1.75}
            pixelSize={1}
            glow={0.8}
            mouseInteraction
            sway={0.3}
            depth={1}
            brightness={1.85}
            lightMode
          />
        </Suspense>
      </div>
      <div
        className={`dot-grid-layer ${scene === 'contact' ? 'is-visible' : ''}`}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <DotGrid
            baseColor="#3a3446"
            activeColor="#ffffff"
            shape="circle"
            dotSize={4}
            gap={8}
            proximity={140}
            strength={1}
            bounce={0.6}
            tension={0.4}
            returnDuration={0.8}
            shockRadius={410}
            shockStrength={5}
            swell={1.1}
            stretch={0.5}
            glow={0.5}
            fade={0}
            intro
            paused={scene !== 'contact'}
          />
        </Suspense>
      </div>
      <div
        className={`halftone-scene-layer ${scene === 'studio' ? 'is-visible' : ''}`}
        aria-hidden="true"
      >
        <Suspense fallback={null}>
          <HalftoneReveal
            src="/media/halftone-studio-cutout.png"
            mode="mono"
            shape="dot"
            cellSize={6}
            angle={45}
            inkColor="#f372ba"
            paperColor="#120f17"
            revealRadius={160}
            intro={false}
            maxDpr={1.25}
            transparent
          />
        </Suspense>
      </div>
      <Suspense fallback={null}>
        <ExperienceCanvas
          config={config}
          progress={progress}
          activeProjectIndex={activeProjectIndex}
          reducedMotion={reducedMotion}
          introActive={introVisible && !reducedMotion}
          introDuration={introDuration}
          introStartedAt={introStartedAtRef.current}
        />
      </Suspense>
      <div className="film-grain" aria-hidden="true" />
      <div className="scanlines" aria-hidden="true" />
      <audio
        ref={voiceAudioRef}
        src="/audio/11-yue-18.mp3"
        autoPlay
        playsInline
        loop
        preload="auto"
        onCanPlay={() => {
          if (autoplayPendingRef.current) setAmbientSound(true);
        }}
        hidden
      />

      {introVisible ? (
        <IntroLoader
          brand={config.brand}
          duration={introDuration}
          onSkip={finishIntro}
        />
      ) : null}

      <SiteHeader
        brand={config.brand}
        nav={config.nav}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenMenu={() => setMenuOpen(true)}
        menuOpen={menuOpen}
      />

      <SceneHud scene={scene} availability={config.hero.availability} />

      <main id="main-content">
        <section className="scene scene-hero" id="top" aria-labelledby="hero-title">
          <div className="hero-rail" aria-hidden="true">
            <span>WEN/JUN — WORLD_01</span>
            <span>REALTIME / WEBGL / VOLUME</span>
          </div>

          <div className="hero-copy">
            <p className="eyebrow">
              <span>00</span>
              {config.hero.eyebrow}
            </p>
            <div
              className={`hero-title-stage ${
                rippleTitleReady ? 'is-ripple-ready' : ''
              }`}
            >
              <h1 id="hero-title">
                {config.hero.lines.map((line, index) => (
                  <span className={`hero-line hero-line-${index + 1}`} key={line}>
                    {line}
                  </span>
                ))}
                {config.hero.tail ? <em>{config.hero.tail}</em> : null}
              </h1>
              {!reducedMotion ? (
                <RippleText
                  lines={config.hero.lines}
                  onReady={handleRippleReady}
                />
              ) : null}
            </div>
            {config.hero.aside?.length ? (
              <div className="hero-aside">
                {config.hero.aside.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="hero-footer">
            <p>{config.hero.intro}</p>
            <a className="scroll-cue" href="#work">
              <span>{config.hero.scrollLabel}</span>
              <i>
                <Arrow direction="down" />
              </i>
            </a>
            <div className="hero-index">
              <span>Phase</span>
              <strong>ENTRY</strong>
              <span>00—01</span>
            </div>
          </div>
        </section>

        <section className="scene scene-work" id="work" aria-labelledby="work-title">
          <div className="section-heading">
            <p className="eyebrow">
              <span>01</span>
              Transmissions / Selected worlds
            </p>
            <div>
              <WorkTitle ref={workTitleRef} revealed={workTitleRevealed} />
              <span className="heading-index">
                {String(activeProjectIndex + 1).padStart(2, '0')} /{' '}
                {String(projects.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div className="work-stage">
            <div className="work-orbit" aria-hidden="true">
              <i />
              <i />
              <span>RECORDED TRANSMISSION</span>
            </div>
            {projects.length ? (
              <div className="project-list">
                {projects.map((project, index) => (
                  <button
                    className={`project-item ${index === activeProjectIndex ? 'is-active' : ''}`}
                    type="button"
                    key={project.id}
                    onClick={(event) => openProject(index, event.currentTarget)}
                    aria-label={`Open project ${project.title}`}
                  >
                    <span className="project-media">
                      {project.image ? <img src={project.image} alt="" /> : null}
                      <i style={{ '--project-accent': project.accent }} />
                    </span>
                    <span className="project-meta">
                      <small>{String(index + 1).padStart(2, '0')}</small>
                      <strong>{project.title}</strong>
                      <span>
                        {project.category} / {project.year}
                      </span>
                    </span>
                    <Arrow />
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-projects">
                Add projects in <code>src/data/studio.js</code> to populate this world.
              </p>
            )}
          </div>

          <div className="work-footer">
            <span>Scroll to traverse</span>
            <p>每一个项目都是一个新的物理法则。</p>
          </div>
        </section>

        <section className="scene scene-studio" id="studio" aria-labelledby="studio-title">
          <div className="section-heading studio-heading">
            <p className="eyebrow">
              <span>02</span>
              Practice / Between systems
            </p>
          </div>

          <div className="studio-statement">
            <span>{config.studio.kicker}</span>
            <div className="studio-statement-copy">
              <StudioWaveTitle text={config.studio.statement} />
              <p className="studio-statement-cn">
                {config.studio.statementCn}
              </p>
            </div>
            <p>{config.studio.note}</p>
          </div>

          <div className="services-list">
            {config.studio.services.map((service, index) => (
              <article key={service.title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>
                  {service.title}
                  {service.titleCn ? <small>{service.titleCn}</small> : null}
                </h3>
                <p>{service.copy}</p>
                <i />
              </article>
            ))}
          </div>

          <div className="studio-stats">
            {config.studio.stats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="scene scene-contact" id="contact" aria-labelledby="contact-title">
          <div className="contact-orb" aria-hidden="true">
            <i />
            <i />
            <span />
          </div>
          <p className="eyebrow">
            <span>03</span>
            {config.contact.eyebrow}
          </p>
          <h2 id="contact-title">
            {config.contact.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h2>
          <p className="contact-title-zh" lang="zh-CN">
            如何联系我
          </p>

          <div className="contact-body">
            <p>
              {config.contact.availability}
              <br />
              {config.contact.location}
            </p>
            <a
              className="contact-email"
              href={`mailto:${config.contact.email}`}
              onClick={handleContactEmail}
              aria-label={`Email ${config.contact.email}. ${emailCopied ? 'Address copied.' : 'Click to copy.'}`}
            >
              <span>
                {config.contact.email}
                <small aria-live="polite">{emailCopied ? 'COPIED' : 'CLICK TO COPY'}</small>
              </span>
              <i>
                <Arrow />
              </i>
            </a>
          </div>

          <footer className="site-footer">
            <div>
              <span>{config.brand.name}</span>
              <small>{config.brand.descriptor}</small>
            </div>
            <div className="footer-socials">
              {config.contact.socials.map((social) => (
                <a href={social.href} key={social.label}>
                  {social.label}
                </a>
              ))}
            </div>
            <div>
              <span>© 2026 WEN/JUN</span>
              <a href="#top">Return to entry ↑</a>
            </div>
          </footer>
        </section>
      </main>

      <MenuOverlay
        open={menuOpen}
        brand={config.brand}
        nav={config.nav}
        contact={config.contact}
        onClose={closeMenu}
      />
      <ProjectDialog
        project={selectedProject}
        index={selectedIndex ?? 0}
        total={projects.length}
        onClose={closeProject}
        onNext={nextProject}
      />
    </div>
  );
}

export default App;
