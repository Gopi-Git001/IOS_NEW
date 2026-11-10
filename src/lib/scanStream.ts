import type { JevVerdict, ScanResult } from '../types';

export type ScanEvent =
  | { event: 'jev'; jev: JevVerdict; timing?: unknown }
  | { event: 'reading'; result?: ScanResult; error?: string; code?: string; status?: number; timing?: unknown };

/** Stateful NDJSON decoder. A chunk may split a UTF-8 character or contain many events. */
export function scanStreamParser(onEvent: (event: ScanEvent) => void) {
  let decoder: TextDecoder | undefined;
  let pending = '';
  const line = (text: string) => {
    if (!text.trim()) return;
    const event = JSON.parse(text);
    if (event?.event !== 'jev' && event?.event !== 'reading') throw new Error('Unexpected scan response');
    if (event.event === 'jev' && !event.jev?.status) throw new Error('Missing verdict');
    if (event.event === 'reading' && !event.result && typeof event.error !== 'string') throw new Error('Missing reading');
    onEvent(event);
  };
  const drain = () => {
    let end;
    while ((end = pending.indexOf('\n')) >= 0) {
      line(pending.slice(0, end));
      pending = pending.slice(end + 1);
    }
    if (pending.length > 1_000_000) throw new Error('Scan response too large');
  };
  return {
    feed(chunk: Uint8Array) { decoder ??= new TextDecoder(); pending += decoder.decode(chunk, { stream: true }); drain(); },
    feedText(chunk: string) { pending += chunk; drain(); },
    finish() { pending += decoder?.decode() ?? ''; drain(); line(pending); pending = ''; },
  };
}

/** Uses incremental delivery on web, whole-body decoding on non-streaming fetch runtimes. */
export async function readScanStream(response: Response, onEvent: (event: ScanEvent) => void) {
  const parser = scanStreamParser(onEvent);
  const reader = typeof TextDecoder === 'undefined' ? undefined : response.body?.getReader?.();
  if (!reader) parser.feedText(await response.text());
  else {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        parser.feed(value);
      }
    } finally { reader.releaseLock(); }
  }
  parser.finish();
}

/** The same retryable connection/deadline failures as the legacy lists request. */
export class RetryableScanError extends Error {}

/** Deadline covers upload and streamed lists; only a missing function permits legacy fallback. */
export async function requestScanStream(
  send: (signal: AbortSignal) => Promise<Response>,
  onEvent: (event: ScanEvent) => void,
  timeoutMs: number,
): Promise<boolean> {
  const controller = new AbortController();
  const failed = "Couldn't read the label. Try again.";
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RetryableScanError(failed));
    }, timeoutMs);
  });
  const attempt = async () => {
    let response: Response;
    try { response = await send(controller.signal); }
    catch { throw new RetryableScanError(failed); }
    if (controller.signal.aborted) throw new RetryableScanError(failed);
    if (response.status === 404) return false;
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (response.status >= 500) throw new RetryableScanError(failed);
      throw new Error(typeof body?.error === 'string' ? body.error : failed);
    }
    try {
      await readScanStream(response, (event) => { if (!finished) onEvent(event); });
    } catch { throw new RetryableScanError(failed); }
    return true;
  };
  try { return await Promise.race([attempt(), deadline]); }
  finally { finished = true; clearTimeout(timer); }
}
