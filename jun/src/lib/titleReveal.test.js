import { describe, expect, it } from 'vitest';
import { getTitleRevealAction } from './titleReveal.js';

describe('getTitleRevealAction', () => {
  it('reveals once when the heading reaches the reveal threshold', () => {
    expect(
      getTitleRevealAction(
        { isIntersecting: true, intersectionRatio: 0.45 },
        true,
      ),
    ).toBe('reveal');
  });

  it('does not reveal before the heading reaches the reveal threshold', () => {
    expect(
      getTitleRevealAction(
        { isIntersecting: true, intersectionRatio: 0.2 },
        true,
      ),
    ).toBe(null);
  });

  it('rearms after the heading leaves the viewport', () => {
    expect(
      getTitleRevealAction(
        { isIntersecting: false, intersectionRatio: 0.07 },
        false,
      ),
    ).toBe('rearm');
  });

  it('does not emit another action while a revealed heading is still visible', () => {
    expect(
      getTitleRevealAction(
        { isIntersecting: true, intersectionRatio: 0.8 },
        false,
      ),
    ).toBe(null);
  });
});
