import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel, streamScan, RetryableReadError, UnreadableError } from './api';
import { combine, type ScanUpdate as Combined } from './combine';
import type { Photo } from './photo';
import { markScan, noteScan } from './scanTiming';

/** What the screen shows; when the lists can be retried, `retryLists` asks Claude again for the same photo. */
export type ScanUpdate =
  | (Extract<Combined, { status: 'done' }> & { retryLists?: () => void })
  | Extract<Combined, { status: 'error' }>;

/**
 * One upload streams Jev first, then the reading; HTTP 404 uses legacy parallel calls.
 * Lists timeouts/failures can still be retried in place without asking Jev again.
 */
export async function runScan(photo: Photo, onUpdate: (u: ScanUpdate) => void) {
  const image = await preparePhoto(photo);
  markScan('prepared');
  noteScan({ image_kb: Math.round((image.length * 3) / 4 / 1024) });
  let jev: JevVerdict | null = null;
  let reading: ScanResult | null = null;
  let readingFailed = false;
  let readingError = '';
  let readingUnreadable = false;
  let readingRetryable = false;
  let last: string | null = null;

  const push = () => {
    let u: ScanUpdate | null = combine(jev, reading, readingFailed, readingUnreadable, readingRetryable);
    if (u?.status === 'error' && !readingUnreadable && readingError && !['not_a_label', 'unreadable'].includes((jev as JevVerdict | null)?.status ?? '')) u = { status: 'error', message: readingError };
    if (!u) return;
    const key = JSON.stringify(u);
    if (key === last) return;
    last = key;
    onUpdate(u.status === 'done' && u.listsRetry ? { ...u, retryLists } : u);
  };

  const readLists = () =>
    readLabel(image, photo.meta).then(
      (r) => {
        markScan('scan_label_response');
        reading = r;
        push();
      },
      (e) => {
        markScan('scan_label_response');
        readingFailed = true;
        readingUnreadable = e instanceof UnreadableError;
        readingRetryable = e instanceof RetryableReadError;
        readingError = e instanceof Error ? e.message : '';
        push();
      },
    );

  const retryLists = () => {
    if (!readingFailed || !readingRetryable) return;
    readingFailed = false;
    readingRetryable = false;
    readingError = '';
    push();
    void readLists();
  };

  markScan('upload_start');
  let gotJev = false;
  let gotReading = false;
  const started = performance.now();
  try {
    const streamed = await streamScan(image, (event) => {
      if (event.event === 'jev') {
        gotJev = true;
        markScan('quick_verdict_response');
        noteScan({ quick_verdict_server: event.timing });
        jev = event.jev;
      } else {
        gotReading = true;
        markScan('scan_label_response');
        reading = event.result ?? null;
        readingFailed = !reading;
        readingUnreadable = event.code === 'unreadable';
        readingRetryable = (event.status ?? 0) >= 500 || ['reader_timeout', 'reader_unavailable'].includes(event.code ?? '');
        readingError = event.error ?? '';
        noteScan({
          scan_label_server: event.timing,
          scan_label_outcome: reading ? 'ok' : event.status ? `http_${event.status}` : 'error',
          scan_label_ms: Math.round(performance.now() - started),
          ...(!reading && { scan_label_error: event.code ?? event.error }),
        });
      }
      push();
    }, photo.meta);
    if (streamed) {
      if (!gotJev || !gotReading) throw new RetryableReadError('Scan connection ended early. Try again.');
      return;
    }
  } catch (error) {
    jev ??= { status: 'unavailable', reason: 'Scan connection failed' };
    readingFailed = !reading;
    readingRetryable = error instanceof RetryableReadError;
    readingError = error instanceof Error ? error.message : '';
    if (!gotReading) {
      markScan('scan_label_response');
      noteScan({ scan_label_outcome: readingRetryable ? 'connection_or_timeout' : 'error', scan_label_ms: Math.round(performance.now() - started) });
    }
    push();
    return;
  }
  // Only HTTP 404 falls back. User-initiated list retries use readLists above, never Jev.
  await Promise.all([
    quickVerdict(image, photo.meta).then((j) => {
      markScan('quick_verdict_response');
      jev = j;
      push();
    }),
    readLists(),
  ]);
}
