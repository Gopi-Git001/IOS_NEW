export type Verdict = 'CLEAN' | 'OKAY' | 'BAD';

export type ScanResult = {
  verdict: Verdict;
  /** Short line under the verdict, e.g. "Too much sugar". */
  headline: string;
  naturalSugars: string[];
  addedSugars: string[];
  /** Artificial sweeteners and sugar alcohols — never listed as added sugars. */
  sweeteners: string[];
  /** Optional closing line at the bottom of the panel. */
  note?: string;
};
