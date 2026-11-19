import { describe, expect, it } from 'vitest';
import {
  createHelixField,
  advanceParticleDisturbance,
  advanceTitleRevealPulse,
  fitProjectPlane,
  getBeaconRingRotation,
  getCoreRotation,
  getGlassXShapePoints,
  getHelixMotion,
  getPointerSensitivity,
  particleBudget,
  qualityForFrameRate,
} from './webgl.js';

describe('WebGL quality controls', () => {
  it('allocates a denser particle field to desktop screens', () => {
    expect(particleBudget(1440, 1000, false)).toBeGreaterThanOrEqual(19000);
  });

  it('increases mobile density without exceeding its particle cap', () => {
    expect(particleBudget(390, 844, true)).toBeGreaterThanOrEqual(8000);
    expect(particleBudget(390, 844, true)).toBeLessThanOrEqual(14000);
  });

  it('builds a bottom-to-top helix surrounded by an ambient particle cloud', () => {
    const field = createHelixField(3000);
    const heights = Array.from(
      { length: field.positions.length / 3 },
      (_, index) => field.positions[index * 3 + 1],
    );
    const strands = new Set(field.strands);
    const radii = Array.from(
      { length: field.positions.length / 3 },
      (_, index) =>
        Math.hypot(
          field.positions[index * 3],
          field.positions[index * 3 + 2],
        ),
    );

    expect(field.positions.length).toBe(9000);
    expect(Math.min(...heights)).toBeLessThan(-5.8);
    expect(Math.max(...heights)).toBeGreaterThan(5.8);
    expect(Math.max(...radii)).toBeGreaterThanOrEqual(2.6);
    const ambientCount = Array.from(field.strands).filter((strand) => strand === 3).length;

    expect(strands).toEqual(new Set([0, 1, 2, 3]));
    expect(ambientCount).toBeGreaterThan(500);
    expect(Math.max(...field.sizes)).toBeGreaterThan(3);
  });

  it('turns the helix slowly while preserving scroll and reduced-motion offsets', () => {
    expect(getHelixMotion(100, 0, 1).rotationY).toBeGreaterThan(1);
    expect(getHelixMotion(100, 0, 1).rotationY).toBeLessThan(2);
    expect(getHelixMotion(100, 0, 0.12).rotationY).toBeLessThan(0.4);
    expect(getHelixMotion(100, 0.5, 1).rotationY).toBeGreaterThan(
      getHelixMotion(100, 0, 1).rotationY,
    );
  });

  it('damps pointer-driven screen motion inside the Work scene', () => {
    expect(getPointerSensitivity(0.08)).toEqual({ x: 1, y: 1, object: 1 });
    expect(getPointerSensitivity(0.34)).toEqual({ x: 0.34, y: 0.28, object: 0.32 });
    expect(getPointerSensitivity(0.82)).toEqual({ x: 1, y: 1, object: 1 });
  });

  it('rotates the background beacon rings faster while respecting reduced motion', () => {
    const full = getBeaconRingRotation(16.67, 1);
    const reduced = getBeaconRingRotation(16.67, 0.12);

    expect(full.outer).toBeGreaterThan(0.001);
    expect(full.middle).toBeLessThan(-0.0014);
    expect(full.orbiting).toBeGreaterThan(0.002);
    expect(reduced.outer).toBeLessThan(full.outer);
  });

  it('rotates the glass X core slowly and respects reduced motion', () => {
    expect(getCoreRotation(1000, 1)).toBeCloseTo(0.055);
    expect(getCoreRotation(1000, 0.12)).toBeLessThan(
      getCoreRotation(1000, 1),
    );
  });

  it('builds a centered glass X with four expanded diagonal arms', () => {
    const points = getGlassXShapePoints();
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);

    expect(points).toHaveLength(12);
    expect(Math.min(...xs)).toBeLessThan(-0.9);
    expect(Math.max(...xs)).toBeGreaterThan(0.9);
    expect(Math.min(...ys)).toBeLessThan(-1);
    expect(Math.max(...ys)).toBeGreaterThan(1);
    expect(points.some(([x, y]) => x < 0 && y > 1)).toBe(true);
    expect(points.some(([x, y]) => x > 0 && y < -1)).toBe(true);
  });

  it('slows both particle scattering and regrouping', () => {
    expect(advanceParticleDisturbance(0, 1, 250)).toBeCloseTo(0.5);
    expect(advanceParticleDisturbance(1, 0, 1500)).toBeCloseTo(0.5);
    expect(advanceParticleDisturbance(1, 0, 4000)).toBe(0);
  });

  it('decays the title reveal pulse over one short cinematic beat', () => {
    expect(advanceTitleRevealPulse(1, 725)).toBeCloseTo(0.5);
    expect(advanceTitleRevealPulse(0.5, 362.5)).toBeCloseTo(0.25);
    expect(advanceTitleRevealPulse(1, 2000)).toBe(0);
  });

  it('enlarges project planes without changing their source aspect ratio', () => {
    const portrait = fitProjectPlane(1170, 1901);
    const landscape = fitProjectPlane(1350, 900);

    expect(portrait.width / portrait.height).toBeCloseTo(1170 / 1901, 4);
    expect(portrait.height).toBeGreaterThan(1.72);
    expect(landscape.width / landscape.height).toBeCloseTo(1350 / 900, 4);
    expect(landscape.width).toBeGreaterThan(2.75);
  });

  it('uses full quality at a healthy frame rate', () => {
    expect(qualityForFrameRate(58)).toEqual({
      pixelRatio: 1.75,
      particleScale: 1,
      reduceEffects: false,
    });
  });

  it('degrades quality under sustained low frame rate', () => {
    expect(qualityForFrameRate(31)).toEqual({
      pixelRatio: 1,
      particleScale: 0.72,
      reduceEffects: true,
    });
  });
});
