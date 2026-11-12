// When the web camera may take a photo by itself. Kept free of React Native so it can be unit tested.

/** Auto-capture starts off: it sometimes missed shots, so people tap the shutter unless they turn it on in Menu. */
export const AUTO_CAPTURE_DEFAULT = false;

/**
 * Auto-capture runs only when the person turned it on and the camera can take a shot right now.
 * Off means LabelCamera.web.tsx starts no frame sampling at all.
 */
export function autoCaptureOn(o: { pref: boolean; scansLeft: boolean; active: boolean; busy: boolean; ready: boolean }): boolean {
  return o.pref && o.scansLeft && o.active && !o.busy && o.ready;
}
