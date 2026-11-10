/** What a result panel shows. RETRY (no verdict, take another photo) is shown as an error instead. */
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
  /**
   * Sugar stacking (2 or more different added sugars) and the place of the first added sugar, counted on the
   * top-level ingredients (supabase/functions/_shared/policy.ts). Optional: older replies and saved scans don't
   * have it, and the server leaves it out for cut-off or non-English lists and when it can't count the list.
   */
  sugarStacking?: { distinct: number; stacked: boolean; firstPosition: number; firstNested: boolean; ingredientCount: number };
  /** Structured rules output from scan-label (policy version, rule id, evidence). Optional; see supabase/functions/_shared/policy.ts. */
  analysis?: { policyVersion: string; registryVersion: string; ruleId: string; explanation: string; missing: string[]; warnings: string[]; unresolved: string[] };
};

/** Jev's fast call (see supabase/functions/_shared/jev.ts). */
export type JevVerdict =
  | { status: 'decided'; verdict: Verdict; confidence: number; model: string }
  | { status: 'unsure'; verdict: Verdict | null; confidence: number | null; model: string }
  | { status: 'not_a_label'; model: string }
  | { status: 'unreadable'; model: string }
  | { status: 'unavailable'; reason: string };
