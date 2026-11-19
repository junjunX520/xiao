import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WorkTitle from './WorkTitle.jsx';

describe('WorkTitle', () => {
  it('keeps the heading text accessible while exposing the reveal state', () => {
    const { rerender } = render(<WorkTitle revealed={false} />);
    const heading = screen.getByRole('heading', {
      name: 'SELECTED FREQUENCIES',
    });

    expect(heading).toHaveAttribute('id', 'work-title');
    expect(heading).not.toHaveClass('is-revealed');

    rerender(<WorkTitle revealed />);

    expect(heading).toHaveClass('is-revealed');
    expect(heading).toHaveTextContent('SELECTED');
    expect(heading).toHaveTextContent('FREQUENCIES');
  });
});
