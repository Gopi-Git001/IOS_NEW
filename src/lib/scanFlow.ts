// Pure: runs Jev and the Claude reading together, waits for both (or Jev's 6 s wait), then shows one verdict.
// No React Native imports, so it runs under Node tests; `scan.ts` passes in the real calls.
import type { JevVerdict, ScanResult } from '../types';
import { combine, type ScanUpdate as Combined } from './combine';

/** Jev's own request gives up after 6 s (supabase/functions/_shared/jev.ts); past that the rules verdict decides. */
export const JEV_WAIT_MS = 6000;

/** What the screen shows; when the lists can be retried, `retryLists` asks Claude again for the same photo. */
export type ScanUpdate =
  | (Extract<Combined, { status: 'done' }> & { retryLists?: () => void })
  | Extract<Combined, { status: 'error' }>;

/** How a failed reading failed: the photo can't be read, a retry may work, or anything else. */
export type ReadFailure = 'unreadable' | 'retryable' | 'other';

export type BothCalls = {
  quickVerdict: () => Promise<JevVerdict>;
  readLabel: () => Promise<ScanResult>;
  readFailure: (e: unknown) => ReadFailure;
  mark?: (step: 'quick_verdict_response' | 'scan_label_response') => void;
  /** Called when Jev's wait passes; `jevPending` is true when Jev still hasn't answered. */
  onJevWaitExpired?: (jevPending: boolean) => void;
  waitMs?: number;
};

/**
 * Shows one verdict once both calls have answered (or Jev's wait has passed), so the verdict never changes
 * after it appears. `onUpdate` is called again only for a lists retry.
 */
export async function runBothCalls(calls: BothCalls, onUpdate: (u: ScanUpdate) => void) {
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
    calls.readLabel().then(
      (r) => {
        calls.mark?.('scan_label_response');
        reading = r;
        push();
      },
      (e) => {
        calls.mark?.('scan_label_response');
        const failure = calls.readFailure(e);
        readingFailed = true;
        readingUnreadable = failure === 'unreadable';
        readingRetryable = failure === 'retryable';
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

  const jevWait = setTimeout(() => {
    jevTimedOut = true;
    calls.onJevWaitExpired?.(jev === null);
    push();
  }, calls.waitMs ?? JEV_WAIT_MS);
  try {
    await Promise.all([
      calls.quickVerdict().then((j) => {
        calls.mark?.('quick_verdict_response');
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
