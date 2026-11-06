import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel } from './api';
import { combine, type ScanUpdate } from './combine';

export type { ScanUpdate };

/**
 * Runs both calls at once and reports each step: Jev's verdict usually lands first,
 * then the full ingredient lists. `onUpdate` may be called twice.
 */
export async function runScan(photoUri: string, onUpdate: (u: ScanUpdate) => void) {
  const image = await preparePhoto(photoUri);
  let jev: JevVerdict | null = null;
  let reading: ScanResult | null = null;
  let readingFailed = false;
  let readingError = '';
  let last: string | null = null;

  const push = () => {
    let u = combine(jev, reading, readingFailed);
    if (u?.status === 'error' && readingError && (jev as JevVerdict | null)?.status !== 'not_a_label') u = { status: 'error', message: readingError };
    if (!u) return;
    const key = JSON.stringify(u);
    if (key !== last) {
      last = key;
      onUpdate(u);
    }
  };

  await Promise.all([
    quickVerdict(image).then((j) => {
      jev = j;
      push();
    }),
    readLabel(image).then(
      (r) => {
        reading = r;
        push();
      },
      (e) => {
        readingFailed = true;
        readingError = e instanceof Error ? e.message : '';
        push();
      },
    ),
  ]);
}
