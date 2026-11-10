import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel, RetryableReadError, UnreadableError } from './api';
import { combine, type ScanUpdate as Combined } from './combine';
import type { Photo } from './photo';
import { markScan, noteScan } from './scanTiming';

/** What the screen shows; when the lists can be retried, `retryLists` asks Claude again for the same photo. */
export type ScanUpdate =
  | (Extract<Combined, { status: 'done' }> & { retryLists?: () => void })
  | Extract<Combined, { status: 'error' }>;

/**
 * Runs both calls at once and reports each step: Jev's verdict usually lands first,
 * then the full ingredient lists. `onUpdate` may be called several times.
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
  await Promise.all([
    quickVerdict(image, photo.meta).then((j) => {
      markScan('quick_verdict_response');
      jev = j;
      push();
    }),
    readLists(),
  ]);
}
