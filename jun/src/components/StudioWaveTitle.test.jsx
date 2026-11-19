import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StudioWaveTitle from './StudioWaveTitle.jsx';

describe('StudioWaveTitle', () => {
  it('keeps the full sentence accessible while splitting it into wave glyphs', () => {
    const text = 'WE SHAPE STRATEGY INTO FORM, AND BRANDS INTO WORLDS.';
    const { container } = render(<StudioWaveTitle text={text} />);
    const heading = screen.getByRole('heading', { name: text });
    const glyphs = container.querySelectorAll('.studio-wave-char');

    expect(heading).toHaveAttribute('id', 'studio-title');
    expect(glyphs).toHaveLength([...text].filter((char) => !/\s/.test(char)).length);
    expect(glyphs[0]).toHaveStyle({ '--wave-index': '0' });
    expect(heading).toHaveTextContent(text);
  });
});
