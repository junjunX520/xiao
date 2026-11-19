import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SideRays from './SideRays.jsx';

describe('SideRays background', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a non-interactive decorative canvas layer', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { container } = render(
      <SideRays
        rayColor1="#FFC46B"
        rayColor2="#96c8ff"
        origin="top-right"
        className="background-side-rays"
      />,
    );

    expect(container.firstChild).toHaveClass(
      'side-rays',
      'background-side-rays',
    );
    expect(container.querySelector('canvas')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });
});
