import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IntroLoader, ProjectDialog } from './Interface.jsx';

describe('IntroLoader accessibility', () => {
  it('announces loading once without streaming every count change', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const { container } = render(
      <IntroLoader
        brand={{
          name: 'WEN/JUN',
          descriptor: 'Independent creative practice',
        }}
        duration={2000}
        onSkip={vi.fn()}
      />,
    );

    expect(screen.getByRole('status', { name: /loading experience/i })).toHaveAttribute(
      'aria-live',
      'off',
    );
    expect(screen.getByText('000')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Spatial assembly')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip intro/i })).toBeInTheDocument();
    expect(container.querySelector('.intro-loader-seed')).not.toBeNull();
    expect(container.querySelector('.intro-loader-seam')).not.toBeNull();
    expect(container.querySelector('.intro-loader-brand-handoff')).not.toBeNull();
    expect(
      container.querySelector('.intro-loader-brand-handoff > span'),
    ).toHaveTextContent('WEN/JUN');
    vi.unstubAllGlobals();
  });
});

describe('ProjectDialog artwork', () => {
  it('marks an image panel for unmodified image rendering', () => {
    const { container } = render(
      <ProjectDialog
        project={{
          title: 'Blue Current',
          category: 'Visual study',
          summary: 'Pure image test.',
          client: 'Test',
          year: '2026',
          services: ['Art Direction'],
          image: '/media/blue-current.webp',
          accent: '#76e6ff',
        }}
        index={0}
        total={1}
        onClose={vi.fn()}
        onNext={vi.fn()}
      />,
    );

    expect(container.querySelector('.project-dialog-art')).toHaveClass('has-image');
    expect(container.querySelector('.project-dialog-art img')).toHaveAttribute(
      'src',
      '/media/blue-current.webp',
    );
  });
});
