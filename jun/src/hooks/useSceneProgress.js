import { useEffect, useState } from 'react';
import { clamp01, getSceneForProgress } from '../lib/story.js';

function readScrollProgress() {
  const scrollHeight = document.documentElement.scrollHeight;
  const maximum = Math.max(0, scrollHeight - window.innerHeight);
  return maximum === 0 ? 0 : clamp01(window.scrollY / maximum);
}

export function useSceneProgress() {
  const [progress, setProgress] = useState(readScrollProgress);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setProgress(readScrollProgress());
      });
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return {
    progress,
    scene: getSceneForProgress(progress),
  };
}
