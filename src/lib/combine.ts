// Pure: how Jev's fast verdict and the Claude reading combine into the one verdict the screen shows.
import type { JevVerdict, ScanResult, Verdict } from '../types';

export const quickHeadline: Record<Verdict, string> = {
  CLEAN: 'No added sugar',
  OKAY: 'A little sugar or a gentler sweetener',
  BAD: 'Added sugar or harsh sweeteners',
};

export type ScanUpdate =
  | { status: 'done'; result: ScanResult; listsPending: boolean; listsRetry?: true }
  | { status: 'error'; message: string };

const NOT_A_LABEL = "That doesn't look like a food label. Fit the ingredient list in the box.";
export const UNCLEAR = "The photo isn't clear enough to read. Hold steady, move closer to the ingredient list, and try again.";
const READ_FAILED = "Couldn't read the label. Try again.";

const STRICTNESS: Record<Verdict, number> = { CLEAN: 0, OKAY: 1, BAD: 2 };

/**
 * The rules verdict comes from the ingredients the reading found, so it is a floor: Jev can make the
 * verdict stricter, never milder. Added sugar, an artificial sweetener or alcohol is never CLEAN.
 */
export const stricter = (a: Verdict, b: Verdict): Verdict => (STRICTNESS[b] > STRICTNESS[a] ? b : a);

/**
 * Combines Jev's verdict (the call) with the Claude reading (the lists and the rules verdict). Returns null
 * while waiting: nothing shows until both have answered, or Jev's wait (`jevTimedOut`) has passed, so the
 * verdict never changes once it is on screen. Exported for tests.
 */
export function combine(
  jev: JevVerdict | null,
  reading: ScanResult | null,
  readingFailed: boolean,
  readingUnreadable = false,
  readingRetryable = false,
  jevTimedOut = false,
): ScanUpdate | null {
  // The reader couldn't make out the words: never guess a verdict, even if Jev already called one.
  if (readingUnreadable) return { status: 'error', message: UNCLEAR };

  const decided = jev?.status === 'decided' ? jev.verdict : null;

  if (reading) {
    if (!jev && !jevTimedOut) return null;
    const verdict = decided ? stricter(decided, reading.verdict) : reading.verdict;
    // Keep the specific rules headline only when the shown verdict is the rules verdict.
    const result: ScanResult =
      verdict === reading.verdict ? reading : { ...reading, verdict, headline: quickHeadline[verdict], note: undefined };
    return { status: 'done', result, listsPending: false };
  }

  // The reading is still on its way: wait for it.
  if (!readingFailed) return null;

  if (decided) {
    // A timeout or dropped connection can be retried in place; other failures just say so.
    const retry = readingRetryable;
    const result: ScanResult = {
      verdict: decided,
      headline: quickHeadline[decided],
      naturalSugars: [],
      addedSugars: [],
      sweeteners: [],
      note: retry ? undefined : "Couldn't list the sugars this time",
    };
    return retry ? { status: 'done', result, listsPending: false, listsRetry: true } : { status: 'done', result, listsPending: false };
  }

  if (jev?.status === 'not_a_label') return { status: 'error', message: NOT_A_LABEL };
  if (jev?.status === 'unreadable') return { status: 'error', message: UNCLEAR };
  if (jev || jevTimedOut) return { status: 'error', message: READ_FAILED };
  return null; // the reading failed before Jev answered: wait for Jev
}
