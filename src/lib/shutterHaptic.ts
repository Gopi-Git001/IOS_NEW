/** Buzzes for the shutter only when the Haptics setting is on (same setting as the verdict buzz). */
export function shutterHaptic(prefs: { haptics: boolean }, buzz: () => Promise<unknown>): void {
  if (!prefs.haptics) return;
  buzz().catch(() => {});
}
