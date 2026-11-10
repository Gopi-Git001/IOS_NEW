import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel, RetryableReadError, UnreadableError } from './api';
import { combine, type ScanUpdate as Combined } from './combine';
import type { Photo } from './photo';
import { markScan, noteScan } from './scanTiming';

/** Jev's own request gives up after 6 s (supabase/functions/_shared/jev.ts); past that the rules verdict decides. */
export const JEV_WAIT_MS = 6000;

/** What the screen shows; when the lists can be retried, `retryLists` asks Claude again for the same photo. */
export type ScanUpdate =
  | (Extract<Combined, { status: 'done' }> & { retryLists?: () => void })
  | Extract<Combined, { status: 'error' }>;

/**
 * Runs both calls at once and shows one verdict once both have answered (or Jev's wait has passed),
 * so the verdict never changes after it appears. `onUpdate` is called again only for a lists retry.
 */
export async function runScan(photo: Photo, onUpdate: (u: ScanUpdate) => void) {
  const image = await preparePhoto(photo);
  markScan('prepared');
  noteScan({ image_kb: Math.round((image.length * 3) / 4 / 1024) });
  let jev: JevVerdict | null = null;
  let jevTimedOut = false;
  let reading: ScanResult | null = null;
  let readingFailed = false;
  let readingError = '';
  let readingUnreadable = false;
  let readingRetryable = false;
  let shown: Extract<ScanUpdate, { status: 'done' }> | null = null;
  let settled = false;
  let last: string | null = null;

  const push = () => {
    let u: ScanUpdate | null = combine(jev, reading, readingFailed, readingUnreadable, readingRetryable, jevTimedOut);
    if (u?.status === 'error' && !readingUnreadable && readingError && !['not_a_label', 'unreadable'].includes((jev as JevVerdict | null)?.status ?? '')) u = { status: 'error', message: readingError };
    if (!u) return;
    const key = JSON.stringify(u);
    if (key === last) return;
    last = key;
    const update = u.status === 'done' && u.listsRetry ? { ...u, retryLists } : u;
    settled = true;
    if (update.status === 'done') shown = update;
    onUpdate(update);
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
    if (!readingFailed || !readingRetryable || !shown) return;
    readingFailed = false;
    readingRetryable = false;
    readingError = '';
    // The verdict stays on screen while the lists load again.
    last = null;
    onUpdate({ status: 'done', result: shown.result, listsPending: true });
    void readLists();
  };

  markScan('upload_start');
  const jevWait = setTimeout(() => {
    jevTimedOut = true;
    noteScan({ jev_wait_expired: jev === null });
    push();
  }, JEV_WAIT_MS);
  try {
    await Promise.all([
      quickVerdict(image, photo.meta).then((j) => {
        markScan('quick_verdict_response');
        // A late answer can't change what is already on screen.
        if (settled) return;
        jev = j;
        push();
      }),
      readLists(),
    ]);
  } finally {
    clearTimeout(jevWait);
  }
}
