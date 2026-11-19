import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORK_TITLE_REVEAL_EVENT } from '../lib/titleReveal.js';
import { useWorkTitleReveal } from './useWorkTitleReveal.js';

let observerCallback;
let observerInstance;

class MockIntersectionObserver {
  constructor(callback) {
    observerCallback = callback;
    observerInstance = this;
  }

  observe = vi.fn();

  disconnect = vi.fn();
}

function Harness({ enabled = true, reducedMotion = false }) {
  const { ref, revealed } = useWorkTitleReveal({ enabled, reducedMotion });

  return (
    <div ref={ref} data-testid="reveal-target" data-revealed={revealed} />
  );
}

describe('useWorkTitleReveal', () => {
  beforeEach(() => {
    observerCallback = undefined;
    observerInstance = undefined;
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('reveals once per viewport entry and rearms after leaving', () => {
    const revealListener = vi.fn();
    window.addEventListener(WORK_TITLE_REVEAL_EVENT, revealListener);

    render(<Harness />);

    expect(observerInstance.observe).toHaveBeenCalledWith(
      screen.getByTestId('reveal-target'),
    );

    act(() => {
      observerCallback([
        { isIntersecting: true, intersectionRatio: 0.6 },
      ]);
    });
    expect(screen.getByTestId('reveal-target')).toHaveAttribute(
      'data-revealed',
      'true',
    );
    expect(revealListener).toHaveBeenCalledTimes(1);

    act(() => {
      observerCallback([
        { isIntersecting: true, intersectionRatio: 0.8 },
      ]);
    });
    expect(revealListener).toHaveBeenCalledTimes(1);

    act(() => {
      observerCallback([
        { isIntersecting: false, intersectionRatio: 0 },
      ]);
    });
    expect(screen.getByTestId('reveal-target')).toHaveAttribute(
      'data-revealed',
      'false',
    );

    act(() => {
      observerCallback([
        { isIntersecting: true, intersectionRatio: 0.5 },
      ]);
    });
    expect(revealListener).toHaveBeenCalledTimes(2);
    window.removeEventListener(WORK_TITLE_REVEAL_EVENT, revealListener);
  });

  it('shows the final state without observing when reduced motion is enabled', () => {
    const revealListener = vi.fn();
    window.addEventListener(WORK_TITLE_REVEAL_EVENT, revealListener);

    render(<Harness reducedMotion />);

    expect(observerInstance).toBeUndefined();
    expect(screen.getByTestId('reveal-target')).toHaveAttribute(
      'data-revealed',
      'true',
    );
    expect(revealListener).not.toHaveBeenCalled();
    window.removeEventListener(WORK_TITLE_REVEAL_EVENT, revealListener);
  });
});
