import { Platform } from 'react-native';
import { postScanQuietly } from './scanTransport';
import { clientTrace } from '../../supabase/functions/_shared/clientTrace';

// Trace of one scan, from shutter tap to lists on screen. Printed to the console as
// `[scan-timing] {...}`; in the browser it is also posted to the Metro dev server (see
// metro.config.js), which appends it to .scan-timing/scans.jsonl for `npm run timing:report`.

type Trace = { id: string; t0: number; marks: Record<string, number>; info: Record<string, unknown> };

let current: Trace | null = null;

export function startScanTiming() {
  current = { id: Math.random().toString(36).slice(2, 10), t0: performance.now(), marks: { tap: 0 }, info: {} };
}

export const scanTimingId = () => current?.id;

/** Milliseconds since the shutter tap, recorded once per stage. */
export function markScan(stage: string) {
  if (current && !(stage in current.marks)) current.marks[stage] = Math.round(performance.now() - current.t0);
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

export function finishScanTiming() {
  const trace = current;
  if (!trace) return;
  requestAnimationFrame(() => {
    if (trace !== current) return;
    current = null;
    const connection = Platform.OS === 'web' ? (navigator as { connection?: { type?: string; effectiveType?: string } }).connection : undefined;
    const record = {
      id: trace.id,
      at: new Date().toISOString(),
      platform: Platform.OS,
      network: connection?.type ?? connection?.effectiveType,
      ...trace.marks,
      ...trace.info,
    };
    console.log('[scan-timing]', JSON.stringify(record));
    // Explicit allowlist on both ends: no free-text errors, label content, IDs or model results.
    postScanQuietly({ action: 'timing', trace: clientTrace(record) });
    if (__DEV__ && Platform.OS === 'web') {
      fetch('/__scan-timing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => {});
    }
  });
}
