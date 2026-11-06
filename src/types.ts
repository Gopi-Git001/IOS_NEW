export type Verdict = 'CLEAN' | 'BAD' | 'UGLY';

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

/** Jev's fast call (see supabase/functions/_shared/jev.ts). */
export type JevVerdict =
  | { status: 'decided'; verdict: Verdict; confidence: number; model: string }
  | { status: 'unsure'; verdict: Verdict | null; confidence: number | null; model: string }
  | { status: 'not_a_label'; model: string }
  | { status: 'unreadable'; model: string }
  | { status: 'unavailable'; reason: string };
