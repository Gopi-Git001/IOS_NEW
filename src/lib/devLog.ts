/**
 * Dev-only diagnostic logger for the [auth] and [haptics] lines: `[tag] HH:MM:SS.mmm message`
 * (local wall-clock time). The tag stays first so `grep '\[auth\]'` still finds every line.
 * Silent in release builds (__DEV__ false) and in Node tests (no __DEV__).
 * Never pass tokens, codes, user ids, emails, keys or full URLs with a query / fragment.
 */

export type DevTag = 'auth' | 'haptics';
export type DevLogger = (tag: DevTag, message: string) => void;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Local wall-clock time as HH:MM:SS.mmm. */
export function clockTime(date: Date = new Date()): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

/** "[auth] 15:42:07.123 tap (flow running: no)". */
export function formatDevLine(tag: DevTag, message: string, date: Date = new Date()): string {
  return `[${tag}] ${clockTime(date)} ${message}`;
}

/** A logger that writes to `sink` only when `enabled`. */
export function makeDevLog(enabled: boolean, sink: (line: string) => void = (line) => console.log(line), now: () => Date = () => new Date()): DevLogger {
  return enabled ? (tag, message) => sink(formatDevLine(tag, message, now())) : () => {};
}

/** True in Expo dev builds only. */
export const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/** The shared dev logger. */
export const devLog: DevLogger = makeDevLog(isDev);
