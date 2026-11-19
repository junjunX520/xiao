import { describe, expect, it } from 'vitest';
import { getIntroDuration, getIntroSceneState } from './intro.js';

describe('spatial intro timeline', () => {
  it('clamps the opening scene to a visible black frame', () => {
    expect(getIntroSceneState(-1)).toEqual({
      particles: 0,
      rings: 0,
      core: 0,
      cameraZ: 12.8,
      overlay: 1,
    });
  });

  it('ends exactly at the normal hero scene values', () => {
    expect(getIntroSceneState(1)).toEqual({
      particles: 1,
      rings: 1,
      core: 1,
      cameraZ: 7.7,
      overlay: 0,
    });
  });

  it('reveals DNA particles monotonically before the rings settle', () => {
    const values = [0, 0.12, 0.28, 0.46, 0.58].map(
      (progress) => getIntroSceneState(progress).particles,
    );

    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(values.at(-1)).toBe(1);
  });

  it('uses a shorter intro on mobile and skips it for reduced motion', () => {
    expect(getIntroDuration(false, false)).toBe(3600);
    expect(getIntroDuration(true, false)).toBe(3000);
    expect(getIntroDuration(false, true)).toBe(0);
  });
});
