import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  destroyAmbientAudio,
  toggleAmbientAudio,
} from './audio.js';

function makeAudio(volume = 0.4) {
  return {
    currentTime: 0,
    loop: false,
    muted: true,
    volume,
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('voice audio state', () => {
  it('enables looping playback and fades the voice in', async () => {
    vi.useFakeTimers();
    const audio = makeAudio(0);

    const next = await toggleAmbientAudio({}, true, audio);
    await vi.advanceTimersByTimeAsync(520);

    expect(next.active).toBe(true);
    expect(audio.loop).toBe(true);
    expect(audio.play).toHaveBeenCalledOnce();
    expect(audio.volume).toBeCloseTo(0.55);
  });

  it('fades out and pauses the voice when disabled', async () => {
    vi.useFakeTimers();
    const audio = makeAudio(0.55);

    const next = await toggleAmbientAudio({ audio }, false, audio);
    await vi.advanceTimersByTimeAsync(520);

    expect(next.active).toBe(false);
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.volume).toBe(0);
  });

  it('stays disabled when browser playback is rejected', async () => {
    const audio = makeAudio(0);
    audio.play.mockRejectedValueOnce(new Error('blocked'));

    const next = await toggleAmbientAudio({}, true, audio);

    expect(next.active).toBe(false);
    expect(audio.pause).toHaveBeenCalledOnce();
  });

  it('pauses and rewinds the voice during cleanup', () => {
    const audio = makeAudio();
    audio.currentTime = 12;

    destroyAmbientAudio({ audio, fadeTimer: 0 });

    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(0);
  });
});
