export const WORK_TITLE_REVEAL_EVENT = 'work-title-reveal';

const REVEAL_THRESHOLD = 0.45;
const REARM_THRESHOLD = 0.08;

export function getTitleRevealAction(entry, armed) {
  if (armed) {
    return entry.isIntersecting && entry.intersectionRatio >= REVEAL_THRESHOLD
      ? 'reveal'
      : null;
  }

  return !entry.isIntersecting && entry.intersectionRatio < REARM_THRESHOLD
    ? 'rearm'
    : null;
}
