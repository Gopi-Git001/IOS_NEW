import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { postScanQuietly } from './scanTransport';
import { clientTrace } from '../../supabase/functions/_shared/clientTrace';
import { addMark, redactTrace, scanDurations, timingSummary } from './scanTimingCore';

// Trace of one scan, from shutter tap to lists on screen. In development builds (or with
// EXPO_PUBLIC_SCAN_TIMING=1) it is printed to the console as `[scan-timing] {...}` plus a readable
// `[scan-timing] steps ...` line; in dev it is also posted to the Metro dev server (see metro.config.js),
// which appends it to .scan-timing/scans.jsonl for `npm run timing:report`. Expo Go posts there too.
// Steps (ms since tap): shutter_done, captured, prepared, upload_start, session_ready, response_headers,
// quick_verdict_response, scan_label_response, verdict_on_screen, lists_on_screen (see scanTimingCore.ts).
// Everything logged goes through `redactTrace` first: durations, sizes, statuses and step names only.

type Trace = { id: string; t0: number; marks: Record<string, number>; info: Record<string, unknown> };

let current: Trace | null = null;

/** Console logging: development builds, or an explicit opt-in flag for a release build. */
const logEnabled = () => __DEV__ || process.env.EXPO_PUBLIC_SCAN_TIMING === '1';

export function startScanTiming() {
  current = { id: Math.random().toString(36).slice(2, 10), t0: performance.now(), marks: { tap: 0 }, info: {} };
}

export const scanTimingId = () => current?.id;

/** Milliseconds since the shutter tap, recorded once per stage. */
export function markScan(stage: string) {
  if (current) addMark(current.marks, stage, performance.now() - current.t0);
}

export function noteScan(info: Record<string, unknown>) {
  if (current) Object.assign(current.info, info);
}

/** Marks a stage after the next frame is painted, so "on screen" means visible. */
export function markScanPainted(stage: string) {
  const trace = current;
  requestAnimationFrame(() => {
    if (trace === current) markScan(stage);
  });
}

/**
 * Dev only: the Metro server's timing endpoint. The browser posts to its own origin; Expo Go on the
 * iPhone posts to the Metro host it loaded the bundle from, so its scans land in the same report.
 */
function devTimingEndpoint(): string | null {
  if (!__DEV__) return null;
  if (Platform.OS === 'web') return '/__scan-timing';
  const host = Constants.expoConfig?.hostUri;
  return host && /^[\w.-]+:\d+$/.test(host) ? `http://${host}/__scan-timing` : null;
}

export function finishScanTiming() {
  const trace = current;
  if (!trace) return;
  requestAnimationFrame(() => {
    if (trace !== current) return;
    current = null;
    const connection = Platform.OS === 'web' ? (navigator as { connection?: { type?: string; effectiveType?: string } }).connection : undefined;
    const record = redactTrace({
      id: trace.id,
      at: new Date().toISOString(),
      platform: Platform.OS,
      network: connection?.type ?? connection?.effectiveType,
      ...trace.marks,
      ...trace.info,
      steps: scanDurations(trace.marks),
    });
    // Explicit allowlist on both ends: no free-text errors, label content, IDs or model results.
    postScanQuietly({ action: 'timing', trace: clientTrace(record) });
    if (!logEnabled()) return;
    console.log('[scan-timing]', JSON.stringify(record));
    console.log('[scan-timing] steps', timingSummary(trace.marks));
    const endpoint = devTimingEndpoint();
    if (endpoint) {
      fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => {});
    }
  });
}
