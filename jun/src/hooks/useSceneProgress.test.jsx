import React, { useRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSceneProgress } from './useSceneProgress.js';

function ProgressProbe() {
  const rootRef = useRef(null);
  const { progress, scene } = useSceneProgress(rootRef);

  return (
    <div ref={rootRef} data-testid="probe">
      {progress.toFixed(3)} / {scene}
    </div>
  );
}

describe('useSceneProgress', () => {
  afterEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 0,
    });
  });

  it('maps document scroll to progress and scene', () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 500,
    });

    render(<ProgressProbe />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(screen.getByTestId('probe')).toHaveTextContent('0.500 / work');
  });
});
