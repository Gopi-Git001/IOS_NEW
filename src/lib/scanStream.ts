import type { JevVerdict, ScanResult } from '../types';

export type ScanEvent =
  | { event: 'jev'; jev: JevVerdict; timing?: unknown }
  | { event: 'reading'; result?: ScanResult; error?: string; code?: string; timing?: unknown };

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
