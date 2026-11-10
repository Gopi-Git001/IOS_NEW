// Verdict names changed from CLEAN / BAD / UGLY to CLEAN / OKAY / BAD (Rules v3). Edge Functions that
// haven't been redeployed and scan history saved before the change still use the old names; both are
// converted here. Pure: no React Native imports, so it runs under Node tests.
import type { JevVerdict, ScanResult, Verdict } from '../types';
import type { HistoryEntry } from './display';

/** The "verdicts" marker new Edge Functions and new history entries carry. Without it, "BAD" is the old (OKAY) BAD. */
export const VERDICT_SCHEME = 'v3';

const LEGACY: Record<string, Verdict> = { CLEAN: 'CLEAN', BAD: 'OKAY', UGLY: 'BAD' };
const CURRENT: Record<string, Verdict> = { CLEAN: 'CLEAN', OKAY: 'OKAY', BAD: 'BAD' };

/** A verdict name as sent or saved, read in the given scheme. Null when it isn't a verdict. */
export function toVerdict(name: unknown, scheme: unknown): Verdict | null {
  if (typeof name !== 'string') return null;
  if (name === 'UGLY') return 'BAD';
  if (name === 'OKAY') return 'OKAY';
  return (scheme === VERDICT_SCHEME ? CURRENT : LEGACY)[name] ?? null;
}

/** A scan-label result in the current names, or null when its verdict isn't one. */
export function normalizeResult(result: ScanResult, scheme: unknown): ScanResult | null {
  const verdict = toVerdict(result?.verdict, scheme);
  if (!verdict) return null;
  return verdict === result.verdict ? result : { ...result, verdict };
}

/** Jev's answer in the current names. A decided call with an unknown verdict counts as unavailable. */
export function normalizeJev(jev: JevVerdict, scheme: unknown): JevVerdict {
  if (jev.status === 'decided') {
    const verdict = toVerdict(jev.verdict, scheme);
    return verdict ? { ...jev, verdict } : { status: 'unavailable', reason: `unknown verdict ${String(jev.verdict)}` };
  }
  if (jev.status === 'unsure') return { ...jev, verdict: toVerdict(jev.verdict, scheme) };
  return jev;
}

/** Saved history in the current names. Entries saved before v3 are converted; unreadable ones are dropped. */
export function readHistory(saved: unknown): HistoryEntry[] {
  if (!Array.isArray(saved)) return [];
  return saved.flatMap((entry: HistoryEntry) => {
    if (entry?.scheme === VERDICT_SCHEME) return [entry];
    const result = entry?.result && normalizeResult(entry.result, undefined);
    return result ? [{ ...entry, result, scheme: VERDICT_SCHEME }] : [];
  });
}
