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
