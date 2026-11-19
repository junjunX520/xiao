import { useEffect, useRef, useState } from 'react';
import {
  WORK_TITLE_REVEAL_EVENT,
  getTitleRevealAction,
} from '../lib/titleReveal.js';

export function useWorkTitleReveal({ enabled = true, reducedMotion = false }) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(reducedMotion);

  useEffect(() => {
    if (!enabled) {
      setRevealed(false);
      return undefined;
    }

    if (reducedMotion) {
      setRevealed(true);
      return undefined;
    }

    const target = ref.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }

    let armed = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const action = getTitleRevealAction(entry, armed);
        if (action === 'reveal') {
          armed = false;
          setRevealed(true);
          window.dispatchEvent(
            new CustomEvent(WORK_TITLE_REVEAL_EVENT, {
              detail: { source: 'work-title' },
            }),
          );
        } else if (action === 'rearm') {
          armed = true;
          setRevealed(false);
        }
      },
      { threshold: [0, 0.08, 0.45] },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [enabled, reducedMotion]);

  return { ref, revealed };
}
