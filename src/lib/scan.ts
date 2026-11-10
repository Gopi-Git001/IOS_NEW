import { preparePhoto, quickVerdict, readLabel, RetryableReadError, UnreadableError } from './api';
import type { Photo } from './photo';
import { runBothCalls, type ScanUpdate } from './scanFlow';
import { markScan, noteScan } from './scanTiming';

/**
 * Runs both calls at once and shows one verdict once both have answered (or Jev's wait has passed),
 * so the verdict never changes after it appears. `onUpdate` is called again only for a lists retry.
 */
export async function runScan(photo: Photo, onUpdate: (u: ScanUpdate) => void) {
  const image = await preparePhoto(photo);
  markScan('prepared');
  noteScan({ image_kb: Math.round((image.length * 3) / 4 / 1024) });
  markScan('upload_start');
  await runBothCalls(
    {
      quickVerdict: () => quickVerdict(image, photo.meta),
      readLabel: () => readLabel(image, photo.meta),
      readFailure: (e) => (e instanceof UnreadableError ? 'unreadable' : e instanceof RetryableReadError ? 'retryable' : 'other'),
      mark: markScan,
      onJevWaitExpired: (jevPending) => noteScan({ jev_wait_expired: jevPending }),
    },
    onUpdate,
  );
}
