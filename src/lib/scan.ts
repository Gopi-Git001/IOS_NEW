import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel, UnreadableError } from './api';
import { combine, type ScanUpdate } from './combine';
import type { Photo } from './photo';
import { markScan, noteScan } from './scanTiming';

export type { ScanUpdate };

/**
 * Runs both calls at once and reports each step: Jev's verdict usually lands first,
 * then the full ingredient lists. `onUpdate` may be called twice.
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
  let last: string | null = null;

  const push = () => {
    let u = combine(jev, reading, readingFailed, readingUnreadable);
    if (u?.status === 'error' && !readingUnreadable && readingError && !['not_a_label', 'unreadable'].includes((jev as JevVerdict | null)?.status ?? '')) u = { status: 'error', message: readingError };
    if (!u) return;
    const key = JSON.stringify(u);
    if (key !== last) {
      last = key;
      onUpdate(u);
    }
  };

  markScan('upload_start');
  await Promise.all([
    quickVerdict(image).then((j) => {
      markScan('quick_verdict_response');
      jev = j;
      push();
    }),
    readLabel(image).then(
      (r) => {
        markScan('scan_label_response');
        reading = r;
        push();
      },
      (e) => {
        markScan('scan_label_response');
        readingFailed = true;
        readingUnreadable = e instanceof UnreadableError;
        readingError = e instanceof Error ? e.message : '';
        push();
      },
    ),
  ]);
}
