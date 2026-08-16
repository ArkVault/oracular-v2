export type HeaderOverlay = 'dates' | 'sensors' | 'search' | null;

type VisibleHeaderOverlay = Exclude<HeaderOverlay, null>;

export type HeaderOverlayAction =
  | { type: 'toggle'; overlay: VisibleHeaderOverlay }
  | { type: 'open'; overlay: VisibleHeaderOverlay }
  | { type: 'close'; overlay?: VisibleHeaderOverlay };

export function headerOverlayReducer(
  state: HeaderOverlay,
  action: HeaderOverlayAction,
): HeaderOverlay {
  if (action.type === 'toggle') {
    return state === action.overlay ? null : action.overlay;
  }

  if (action.type === 'open') {
    return action.overlay;
  }

  if (action.overlay && state !== action.overlay) {
    return state;
  }

  return null;
}
