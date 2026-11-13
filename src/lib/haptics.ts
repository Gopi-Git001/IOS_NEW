/**
 * The one place that decides whether a haptic plays. Pure (no expo-haptics import) so it runs in unit tests;
 * callers pass the actual buzz (`() => Haptics.impactAsync(...)`).
 */

export type HapticKind = 'shutter' | 'verdict' | 'select';
export type HapticsSource = 'default' | 'stored';
type Log = (line: string) => void;

/** The Haptics setting is on until the user turns it off in Menu. */
export const HAPTICS_DEFAULT = true;

/**
 * iOS can drop haptics while the camera session is running, so the shutter buzz waits until the camera has
 * closed: the result screen unmounts it right after capture, and stopping the session takes a moment.
 */
export const SHUTTER_HAPTIC_DELAY_MS = 300;

/** Reads the Haptics setting from saved prefs: a stored boolean wins, anything else (first launch, bad data) is the default. */
export function readHapticsPref(saved: unknown): { value: boolean; source: HapticsSource } {
  const value = saved && typeof saved === 'object' ? (saved as { haptics?: unknown }).haptics : undefined;
  return typeof value === 'boolean' ? { value, source: 'stored' } : { value: HAPTICS_DEFAULT, source: 'default' };
}

/** On = buzz, off = never buzz. */
export const shouldBuzz = (prefs: { haptics: boolean }) => prefs.haptics === true;

/**
 * Plays `buzz` only when the setting is on. Never throws; errors from expo-haptics are logged (dev) and swallowed.
 * Returns whether the buzz was started.
 */
export function playHaptic(kind: HapticKind, prefs: { haptics: boolean }, buzz: () => Promise<unknown>, log: Log | undefined = devLog): boolean {
  if (!shouldBuzz(prefs)) {
    log?.(`[haptics] ${kind} skipped (setting off)`);
    return false;
  }
  const fail = (e: unknown) => log?.(`[haptics] ${kind} error: ${e instanceof Error ? e.message : String(e)}`);
  try {
    buzz().then(() => log?.(`[haptics] ${kind} fired`), fail);
  } catch (e) {
    fail(e);
    return false;
  }
  return true;
}

/** Dev-only console logger; undefined in release builds and in Node tests. */
export const devLog: Log | undefined =
  typeof __DEV__ !== 'undefined' && __DEV__ ? (line) => console.log(line) : undefined;
