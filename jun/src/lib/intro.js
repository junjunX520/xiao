function clamp01(value) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

function smoothstep(min, max, value) {
  const progress = clamp01((value - min) / (max - min));
  return progress * progress * (3 - 2 * progress);
}

export function getIntroSceneState(progress) {
  const normalized = clamp01(progress);

  return {
    particles: smoothstep(0, 0.58, normalized),
    rings: smoothstep(0.18, 0.62, normalized),
    core: smoothstep(0.36, 0.78, normalized),
    cameraZ: 12.8 + (7.7 - 12.8) * smoothstep(0, 0.82, normalized),
    overlay: 1 - smoothstep(0.78, 1, normalized),
  };
}

export function getIntroDuration(
  mobile,
  reducedMotion,
  desktopDuration = 3600,
) {
  if (reducedMotion) return 0;
  const safeDuration = Math.max(1, Number(desktopDuration) || 3600);
  return mobile ? Math.round((safeDuration * 3000) / 3600) : safeDuration;
}
