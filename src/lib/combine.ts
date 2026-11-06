// Pure: how Jev's fast verdict and the Claude reading combine into what the screen shows.
import type { JevVerdict, ScanResult, Verdict } from '../types';

export const quickHeadline: Record<Verdict, string> = {
  CLEAN: 'No added sugar',
  BAD: 'Contains sweeteners',
  UGLY: 'Added sugar or harsh sweeteners',
};

export type ScanUpdate =
  | { status: 'done'; result: ScanResult; listsPending: boolean }
  | { status: 'error'; message: string };

const NOT_A_LABEL = "That doesn't look like a food label. Fit the ingredient list in the box.";
export const UNCLEAR = "The photo isn't clear enough to read. Hold steady, move closer to the ingredient list, and try again.";

/** Combines Jev's verdict (the call) with the Claude reading (the lists). Exported for tests. */
export function combine(
  jev: JevVerdict | null,
  reading: ScanResult | null,
  readingFailed: boolean,
  readingUnreadable = false,
): ScanUpdate | null {
  // The reader couldn't make out the words: never guess a verdict, even if Jev already called one.
  if (readingUnreadable) return { status: 'error', message: UNCLEAR };

  const decided = jev?.status === 'decided' ? jev.verdict : null;

  if (reading) {
    if (!decided) return { status: 'done', result: reading, listsPending: false };
    // Jev's call stands; keep the specific rules headline only when both agree.
    const result: ScanResult =
      reading.verdict === decided
        ? reading
        : { ...reading, verdict: decided, headline: quickHeadline[decided], note: undefined };
    return { status: 'done', result, listsPending: false };
  }

  if (decided) {
    const result: ScanResult = {
      verdict: decided,
      headline: quickHeadline[decided],
      naturalSugars: [],
      addedSugars: [],
      sweeteners: [],
      note: readingFailed ? "Couldn't list the sugars this time" : undefined,
    };
    return { status: 'done', result, listsPending: !readingFailed };
  }

  // Jev thinks it's not a label: wait for the reading to confirm instead of flashing an error.
  if (readingFailed && jev?.status === 'not_a_label') return { status: 'error', message: NOT_A_LABEL };
  // Jev found the text illegible and the reader didn't get anything either.
  if (readingFailed && jev?.status === 'unreadable') return { status: 'error', message: UNCLEAR };
  if (readingFailed && jev) return { status: 'error', message: "Couldn't read the label. Try again." };
  return null; // still waiting
}

