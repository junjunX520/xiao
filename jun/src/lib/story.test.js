import { describe, expect, it } from 'vitest';
import {
  clamp01,
  getSceneForProgress,
  mapRange,
  normaliseProjects,
} from './story.js';

describe('story utilities', () => {
  it('clamps progress to the scrollable range', () => {
    expect(clamp01(-0.2)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(1.2)).toBe(1);
  });

  it('maps a range without extrapolating', () => {
    expect(mapRange(0.5, 0, 1, 10, 20)).toBe(15);
  });

  it('derives the four narrative scenes', () => {
    expect(getSceneForProgress(0.1)).toBe('hero');
    expect(getSceneForProgress(0.34)).toBe('work');
    expect(getSceneForProgress(0.62)).toBe('studio');
    expect(getSceneForProgress(0.9)).toBe('contact');
  });

  it('keeps an empty project list safe', () => {
    expect(normaliseProjects([])).toEqual([]);
  });

  it('normalises incomplete project content', () => {
    const [project] = normaliseProjects([{ id: 'p1', title: 'X' }]);

    expect(project.image).toBe('');
    expect(project.services).toEqual([]);
  });
});
