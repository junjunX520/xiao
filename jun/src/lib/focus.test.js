import { afterEach, describe, expect, it } from 'vitest';
import { getFocusableElements, handleModalTab } from './focus.js';

function renderControls() {
  document.body.innerHTML = `
    <div id="modal">
      <button id="first">First</button>
      <button id="disabled" disabled>Disabled</button>
      <button id="skipped" tabindex="-1">Skipped</button>
      <button id="last">Last</button>
    </div>
  `;
  return document.querySelector('#modal');
}

describe('modal focus helpers', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('excludes disabled and negatively indexed controls', () => {
    const container = renderControls();

    expect(getFocusableElements(container).map((element) => element.id)).toEqual([
      'first',
      'last',
    ]);
  });

  it('wraps Tab from the last control to the first', () => {
    const container = renderControls();
    document.querySelector('#last').focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });

    handleModalTab(container, event);

    expect(document.activeElement.id).toBe('first');
    expect(event.defaultPrevented).toBe(true);
  });

  it('wraps Shift+Tab from the first control to the last', () => {
    const container = renderControls();
    document.querySelector('#first').focus();
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });

    handleModalTab(container, event);

    expect(document.activeElement.id).toBe('last');
    expect(event.defaultPrevented).toBe(true);
  });
});
