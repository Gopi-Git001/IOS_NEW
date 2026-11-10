// Per-stage timings for one request, logged as a single `scan_timing` JSON line and echoed back
// to the app (as `timing` in the response body) so one scan can be traced end to end.
import { AsyncLocalStorage } from 'node:async_hooks';

let served = 0;

export type Timer = {
  /** Milliseconds since the request arrived, recorded once per stage. */
  mark: (stage: string) => void;
  set: (fields: Record<string, unknown>) => void;
  snapshot: () => Record<string, unknown>;
};

function startTimer(fn: string): Timer & { log: (status: number) => void } {
  // `cold`: the first real request this isolate serves. performance.now() counts from isolate start.
  const cold = served === 0;
  const isolateAgeMs = Math.round(performance.now());
  const t0 = performance.now();
  const fields: Record<string, unknown> = {};
  const now = () => Math.round(performance.now() - t0);
  const snapshot = () => ({ fn, cold, isolate_age_ms: isolateAgeMs, ...fields, sent_ms: now() });
  return {
    mark: (stage) => {
      fields[`${stage}_ms`] ??= now();
    },
    set: (f) => Object.assign(fields, f),
    snapshot,
    log: (status) => console.log(JSON.stringify({ event: 'scan_timing', status, ...snapshot() })),
  };
}

// withSupabase builds a fresh context for the handler, so the request's timer travels here instead.
const store = new AsyncLocalStorage<Timer>();

/** The current request's timer (a throwaway one outside `timed`, so timing can never break a scan). */
export const requestTimer = (): Timer => store.getStore() ?? startTimer('untimed');

export const imageKb = (base64: string) => Math.round((base64.length * 3) / 4 / 1024);

const CLIENT_KEYS = ['stream_px', 'camera', 'torch', 'capture_path', 'upload_px', 'upload_kb', 'encode_ms'];

/** The app's capture details (`client` in the body), allow-listed and trimmed for the log as `client_*`. */
export function clientFields(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const fields: Record<string, unknown> = {};
  for (const key of CLIENT_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === 'string') fields[`client_${key}`] = value.slice(0, 64);
    else if (typeof value === 'number' || typeof value === 'boolean') fields[`client_${key}`] = value;
  }
  return fields;
}

/** Wraps a fetch handler so the clock starts before the auth check and the log covers every response. */
export function timed(fn: string, handle: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    if (req.method === 'OPTIONS') return handle(req);
    const timer = startTimer(fn);
    served++;
    const res = await store.run(timer, () => handle(req));
    timer.log(res.status);
    return res;
  };
}
