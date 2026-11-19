const SILENT_VOLUME = 0;
const ACTIVE_VOLUME = 0.55;
const FADE_INTERVAL_MS = 40;
const FADE_DURATION_MS = 480;

const clampVolume = (value) =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function clearFade(state) {
  if (state?.fadeTimer) {
    window.clearInterval(state.fadeTimer);
  }
}

function fadeVolume(audio, target, onComplete) {
  const from = clampVolume(audio.volume);
  const to = clampVolume(target);
  const steps = Math.max(
    1,
    Math.ceil(FADE_DURATION_MS / FADE_INTERVAL_MS),
  );
  let step = 0;

  audio.volume = from;
  const timer = window.setInterval(() => {
    step += 1;
    const progress = Math.min(1, step / steps);
    audio.volume = from + (to - from) * progress;

    if (progress >= 1) {
      window.clearInterval(timer);
      audio.volume = to;
      onComplete?.();
    }
  }, FADE_INTERVAL_MS);

  return timer;
}

export async function toggleAmbientAudio(state, enabled, audio) {
  const current = state ?? {};
  clearFade(current);

  if (!audio) {
    return { ...current, active: false, fadeTimer: 0 };
  }

  audio.loop = true;
  audio.muted = false;

  if (!enabled) {
    const fadeTimer = fadeVolume(audio, SILENT_VOLUME, () => {
      audio.pause();
    });
    return {
      ...current,
      audio,
      active: false,
      fadeTimer,
    };
  }

  try {
    audio.volume = SILENT_VOLUME;
    await audio.play();
    const fadeTimer = fadeVolume(audio, ACTIVE_VOLUME);
    return {
      ...current,
      audio,
      active: true,
      fadeTimer,
    };
  } catch {
    audio.pause();
    return {
      ...current,
      audio,
      active: false,
      fadeTimer: 0,
    };
  }
}

export function destroyAmbientAudio(state) {
  clearFade(state);
  if (!state?.audio) return;

  state.audio.pause();
  state.audio.currentTime = 0;
  state.audio.volume = SILENT_VOLUME;
}
