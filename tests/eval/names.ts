// How the eval compares sugar names: the same normalisation the rules use to match the registry
// (case, accents, footnote marks, "Organic" / "Pure" / ... qualifiers), so "PURE CANE SUGAR" = "Cane Sugar".
// Not by registry entry: one entry groups different sugars (Cane Sugar, Coconut Sugar and Brown Sugar
// Syrup are all `sugar`), and comparing by entry would hide a missed name.
import { baseKey, normalizeKey } from '../../supabase/functions/_shared/normalize.ts';

const SUGAR_ALCOHOL_TAG = /\s*\(sugar alcohol\)\s*$/i;

export const canonicalName = (name: string): string => baseKey(normalizeKey(name.replace(SUGAR_ALCOHOL_TAG, '')));
