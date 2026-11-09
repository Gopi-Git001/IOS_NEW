import type { JevVerdict, ScanResult } from '../types';
import { preparePhoto, quickVerdict, readLabel, streamScan, UnreadableError } from './api';
import { combine, type ScanUpdate } from './combine';
import type { Photo } from './photo';
import { markScan, noteScan } from './scanTiming';

export type { ScanUpdate };

/**
 * One upload streams Jev first, then the reading. During rollout, HTTP 404 uses
 * the legacy parallel calls. `onUpdate` may be called twice.
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
  let gotJev = false;
  let gotReading = false;
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
        noteScan({ scan_label_server: event.timing });
        reading = event.result ?? null;
        readingFailed = !reading;
        readingUnreadable = event.code === 'unreadable';
        readingError = event.error ?? '';
      }
      push();
    });
    if (streamed) {
      if (!gotJev || !gotReading) throw new Error('Scan connection ended early. Try again.');
      return;
    }
  } catch (e) {
    // Preserve a fast verdict if the detail stream fails, just like legacy reader failures.
    jev ??= { status: 'unavailable', reason: 'Scan connection failed' };
    readingFailed = !reading;
    readingError = e instanceof Error ? e.message : '';
    push();
    return;
  }
  // Only HTTP 404 falls back, so network errors never double-charge paid models.
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
