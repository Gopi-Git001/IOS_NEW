// Pure helpers for scan timing (no React Native imports, so they run under Node tests).
// A trace holds marks (ms since the shutter tap, one per step) and notes (sizes, statuses).
// Before anything is logged it goes through `redactTrace`: only durations, sizes, statuses and
// step names survive. Never keys, tokens, the photo, ingredient text or free-text messages.

/** Steps of one scan in the order they normally happen. Unknown steps sort after these by time. */
export const SCAN_STEPS = [
  'tap',
  'shutter_done',
  'still_attempt_done',
  'captured',
  'prepared',
  'upload_start',
  'session_ready',
  'response_headers',
  'legacy_request_start',
  'quick_verdict_response',
  'scan_label_response',
  'verdict_on_screen',
  'lists_on_screen',
  'error_on_screen',
] as const;

export type ScanStep = (typeof SCAN_STEPS)[number];

/** Records a step once: the first time wins, later calls for the same step are ignored. */
export function addMark(marks: Record<string, number>, step: string, msSinceTap: number): boolean {
  if (step in marks || !Number.isFinite(msSinceTap)) return false;
  marks[step] = Math.max(0, Math.round(msSinceTap));
  return true;
}

/** Marks as [step, ms] sorted by time; ties keep the normal scan order. */
export function orderedMarks(marks: Record<string, number>): [string, number][] {
  const rank = (step: string) => {
    const i = (SCAN_STEPS as readonly string[]).indexOf(step);
    return i < 0 ? SCAN_STEPS.length : i;
  };
  return Object.entries(marks)
    .filter(([, ms]) => typeof ms === 'number' && Number.isFinite(ms))
    .sort(([a, x], [b, y]) => x - y || rank(a) - rank(b));
}

const span = (marks: Record<string, number>, from: string, to: string) => {
  const a = marks[from];
  const b = marks[to];
  return typeof a === 'number' && typeof b === 'number' && b >= a ? b - a : undefined;
};

/**
 * Named durations (ms) between steps; a duration is left out when either end is missing.
 * `capture_prepare_ms` is the task's 700 ms budget (tap to upload ready).
 */
export function scanDurations(marks: Record<string, number>): Record<string, number> {
  const out: Record<string, number | undefined> = {
    shutter_ms: span(marks, 'tap', 'shutter_done'),
    capture_ms: span(marks, 'tap', 'captured'),
    prepare_ms: span(marks, 'captured', 'prepared'),
    capture_prepare_ms: span(marks, 'tap', 'prepared'),
    to_upload_ms: span(marks, 'prepared', 'upload_start'),
    session_ms: span(marks, 'upload_start', 'session_ready'),
    first_byte_ms: span(marks, 'upload_start', 'response_headers'),
    quick_verdict_ms: span(marks, 'upload_start', 'quick_verdict_response'),
    scan_label_ms: span(marks, 'upload_start', 'scan_label_response'),
    tap_to_verdict_ms: span(marks, 'tap', 'verdict_on_screen'),
    tap_to_lists_ms: span(marks, 'tap', 'lists_on_screen'),
    tap_to_error_ms: span(marks, 'tap', 'error_on_screen'),
  };
  // Render: from the last answer that arrived before the verdict to the verdict being painted.
  const shown = marks.verdict_on_screen;
  if (typeof shown === 'number') {
    const answers = ['quick_verdict_response', 'scan_label_response']
      .map((s) => marks[s])
      .filter((ms): ms is number => typeof ms === 'number' && ms <= shown);
    if (answers.length) out.render_ms = shown - Math.max(...answers);
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Record<string, number>;
}

const PX = /^\d{1,5}x\d{1,5}$/;
const CODE = /^[a-z][a-z0-9_]{0,39}$/;
/** String values allowed per key; every other string is dropped. */
const STRING_RULES: [RegExp, RegExp][] = [
  [/^id$/, /^[a-z0-9]{1,16}$/],
  [/^at$/, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/],
  [/_px$/, PX],
  [/^picture_size$/, /^(default|\d{1,5}x\d{1,5})$/],
  [/^platform$/, /^(web|ios|android)$/],
  [/^network$/, /^(bluetooth|cellular|ethernet|wifi|wimax|other|unknown|none|slow-2g|2g|3g|4g)$/],
  [/^capture_path$/, /^(still|burst|frame|native)$/],
  [/^prepared_in$/, /^demo$/],
  [/^stream_body$/, /^(incremental|whole)$/],
  [/^shown_verdict$/, /^(CLEAN|OKAY|BAD)$/],
  [/_outcome$/, /^(ok|timeout|network|error|bad_verdict|connection_or_timeout|http_\d{3})$/],
  [/^fn$/, /^[a-z][a-z0-9_-]{0,39}$/],
  [/^jev_status$/, CODE],
];
/** Error fields keep a short code (`unreadable`, `reader_timeout`); a sentence becomes `message`. */
const ERROR_KEY = /(^|_)error$/;

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > 3_600_000) return undefined;
    return Number.isInteger(value) ? value : Math.round(value * 1000) / 1000;
  }
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (ERROR_KEY.test(key)) return CODE.test(value) ? value : 'message';
    const rule = STRING_RULES.find(([k]) => k.test(key));
    return rule && rule[1].test(value) ? value : undefined;
  }
  // Server timing snapshots (`quick_verdict_server`, `scan_label_server`, `steps`): one level deep.
  if (value && typeof value === 'object' && !Array.isArray(value) && depth === 0) {
    const nested = redactTrace(value as Record<string, unknown>, depth + 1);
    return Object.keys(nested).length ? nested : undefined;
  }
  return undefined;
}

/** Allowlist redaction: durations, sizes, booleans, known enums and error codes only. */
export function redactTrace(record: Record<string, unknown>, depth = 0): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!/^[a-z][a-z0-9_]{0,63}$/.test(key)) continue;
    const kept = redactValue(key, value, depth);
    if (kept !== undefined) out[key] = kept;
  }
  return out;
}

/** One readable line for the Metro log, e.g. `tap 0 > shutter_done 310 > ... | capture_prepare_ms=640`. */
export function timingSummary(marks: Record<string, number>): string {
  const steps = orderedMarks(marks).map(([s, ms]) => `${s} ${ms}`).join(' > ');
  const durations = Object.entries(scanDurations(marks)).map(([k, v]) => `${k}=${v}`).join(' ');
  return durations ? `${steps} | ${durations}` : steps;
}
