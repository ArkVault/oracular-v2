import { describe, expect, it } from 'vitest';

import { headerOverlayReducer } from './header-overlay-state';

describe('headerOverlayReducer', () => {
  it('should open the requested overlay from the closed state', () => {
    expect(headerOverlayReducer(null, { type: 'toggle', overlay: 'dates' })).toBe(
      'dates',
    );
  });

  it('should replace the active overlay when another one is toggled', () => {
    expect(
      headerOverlayReducer('dates', { type: 'toggle', overlay: 'search' }),
    ).toBe('search');
  });

  it('should close the active overlay when it is toggled again', () => {
    expect(
      headerOverlayReducer('sensors', { type: 'toggle', overlay: 'sensors' }),
    ).toBeNull();
  });

  it('should ignore a targeted close for an inactive overlay', () => {
    expect(
      headerOverlayReducer('search', { type: 'close', overlay: 'dates' }),
    ).toBe('search');
  });
});
