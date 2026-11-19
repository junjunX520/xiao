export function particleBudget(width, height, mobile) {
  const areaScale = Math.sqrt(Math.max(1, width * height)) / 900;
  if (mobile) {
    return Math.round(Math.min(14000, Math.max(8000, 13000 * areaScale)));
  }
  return Math.round(Math.min(35000, Math.max(20000, 15000 * areaScale)));
}

export function qualityForFrameRate(fps) {
  if (fps < 40) {
    return {
      pixelRatio: 1,
      particleScale: 0.72,
      reduceEffects: true,
    };
  }

  return {
    pixelRatio: 1.75,
    particleScale: 1,
    reduceEffects: false,
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createHelixField(count) {
  const total = Math.max(2, Math.floor(count));
  const positions = new Float32Array(total * 3);
  const sizes = new Float32Array(total);
  const speeds = new Float32Array(total);
  const phases = new Float32Array(total);
  const strands = new Uint8Array(total);
  const random = seededRandom(84731);
  const ambientCount = Math.floor(total * 0.2);
  const bondCount = Math.floor(total * 0.14);
  const strandCount = total - bondCount - ambientCount;
  const turns = 3.4;
  const minimumHeight = -6.15;
  const maximumHeight = 6.15;
  const helixRadius = 2.75;

  for (let index = 0; index < strandCount; index += 1) {
    const strand = index % 2;
    const strandIndex = Math.floor(index / 2);
    const strandLength = Math.max(1, Math.ceil(strandCount / 2));
    const t = strandCount === 1 ? 0.5 : strandIndex / (strandLength - 1);
    const angle =
      t * Math.PI * 2 * turns +
      strand * Math.PI +
      (random() - 0.5) * 0.16;
    const radius = helixRadius + (random() - 0.5) * 0.52;
    const offset = index * 3;

    positions[offset] =
      Math.cos(angle) * radius + (random() - 0.5) * 0.16;
    positions[offset + 1] =
      minimumHeight +
      (maximumHeight - minimumHeight) * t +
      (random() - 0.5) * 0.16;
    positions[offset + 2] =
      Math.sin(angle) * radius + (random() - 0.5) * 0.16;
    sizes[index] = 0.62 + random() * 2.05;
    speeds[index] = random();
    phases[index] = random() * Math.PI * 2;
    strands[index] = strand;
  }

  for (let bondIndex = 0; bondIndex < bondCount; bondIndex += 1) {
    const index = strandCount + bondIndex;
    const offset = index * 3;
    const t = random();
    const angle = t * Math.PI * 2 * turns;
    const radius = helixRadius;
    const blend = random();
    const xA = Math.cos(angle) * radius;
    const xB = Math.cos(angle + Math.PI) * radius;
    const zA = Math.sin(angle) * radius;
    const zB = Math.sin(angle + Math.PI) * radius;
    const y =
      minimumHeight +
      (maximumHeight - minimumHeight) * t +
      (random() - 0.5) * 0.07;

    positions[offset] = xA + (xB - xA) * blend;
    positions[offset + 1] = y;
    positions[offset + 2] = zA + (zB - zA) * blend;
    sizes[index] = 0.38 + random() * 1.05;
    speeds[index] = random();
    phases[index] = random() * Math.PI * 2;
    strands[index] = 2;
  }

  const ambientStart = strandCount + bondCount;
  for (let ambientIndex = 0; ambientIndex < ambientCount; ambientIndex += 1) {
    const index = ambientStart + ambientIndex;
    const offset = index * 3;
    const angle = random() * Math.PI * 2;
    const radius = 1.1 + Math.pow(random(), 0.58) * 4.6;
    const isBokeh = random() > 0.86;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] =
      minimumHeight + (maximumHeight - minimumHeight) * random();
    positions[offset + 2] = Math.sin(angle) * radius;
    sizes[index] = isBokeh ? 2.1 + random() * 2.8 : 0.3 + random() * 0.9;
    speeds[index] = random();
    phases[index] = random() * Math.PI * 2;
    strands[index] = 3;
  }

  return { positions, sizes, speeds, phases, strands };
}

export function getHelixMotion(elapsed, scroll, motionScale = 1) {
  return {
    rotationY: elapsed * 0.014 * motionScale + scroll * 0.12 * motionScale,
    rotationZ: 0.02 + Math.sin(scroll * Math.PI) * 0.018,
    positionY: (scroll - 0.5) * 0.22 * motionScale,
  };
}

export function getPointerSensitivity(progress) {
  if (progress >= 0.25 && progress < 0.58) {
    return { x: 0.34, y: 0.28, object: 0.32 };
  }
  return { x: 1, y: 1, object: 1 };
}

export function getBeaconRingRotation(delta, motionScale = 1) {
  return {
    outer: delta * 0.00007 * motionScale,
    middle: delta * -0.000105 * motionScale,
    orbiting: delta * 0.00014 * motionScale,
  };
}

export function getCoreRotation(delta, motionScale = 1) {
  return delta * 0.000055 * motionScale;
}

export function getGlassXShapePoints() {
  return [
    [-0.92, 1.05],
    [-0.5, 1.05],
    [-0.055, 0.14],
    [0.5, 1.05],
    [0.92, 1.05],
    [0.3, 0],
    [0.92, -1.05],
    [0.5, -1.05],
    [0.055, -0.14],
    [-0.5, -1.05],
    [-0.92, -1.05],
    [-0.3, 0],
  ];
}

export function advanceParticleDisturbance(current, target, deltaMs) {
  const nextTarget = Math.min(1, Math.max(0, target));
  const duration = nextTarget > current ? 500 : 3000;
  const step = Math.max(0, deltaMs) / duration;

  if (nextTarget > current) {
    return Math.min(nextTarget, current + step);
  }
  return Math.max(nextTarget, current - step);
}

export function advanceTitleRevealPulse(current, deltaMs, durationMs = 1450) {
  const boundedCurrent = Math.min(1, Math.max(0, current));
  const step = Math.max(0, deltaMs) / Math.max(1, durationMs);
  return Math.max(0, boundedCurrent - step);
}

export function fitProjectPlane(
  naturalWidth,
  naturalHeight,
  maxWidth = 4.4,
  maxHeight = 3.5,
) {
  if (
    !Number.isFinite(naturalWidth) ||
    !Number.isFinite(naturalHeight) ||
    naturalWidth <= 0 ||
    naturalHeight <= 0
  ) {
    return { width: 2.75, height: 1.72 };
  }

  const aspect = naturalWidth / naturalHeight;
  if (aspect >= maxWidth / maxHeight) {
    return { width: maxWidth, height: maxWidth / aspect };
  }

  return { width: maxHeight * aspect, height: maxHeight };
}
