import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from './clipboard.js';

describe('copyText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true after writing to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    await expect(copyText('hello@example.com')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello@example.com');
  });

  it('returns false when clipboard access is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    await expect(copyText('hello@example.com')).resolves.toBe(false);
  });
});
