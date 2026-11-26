// Display-time polish for the sugar-name cards. The registry data is never edited: an alias that
// reads badly on a card is filtered or reformatted here, at render time only.
//
// Two jobs:
//   1. choose a useful "Also listed as" alias (skip "sugar" and aliases already in the name), and
//   2. print that alias the way a label would (HFCS in capitals, otherwise data casing, capitalised).

/**
 * Aliases that say nothing on a card. "Sugar" is the answer to every card in this section, and an
 * alias that merely repeats the name it sits under ("agave" on "Agave nectar") is noise.
 */
const USELESS_ALIASES = new Set(['sugar']);

/** Abbreviations a reader expects in capitals, whatever the data says. */
const CAPITALISE = new Map([['hfcs', 'HFCS']]);

/** Loose comparison: case, punctuation and spacing must not create a false difference. */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * True when `alias` adds no information next to `name`: it is the same word, or one contains the
 * other as a whole phrase ("agave" inside "agave nectar", "syrup" inside "brown rice syrup" would
 * be caught only if the alias were the whole name — containment is checked both ways on purpose).
 */
function isRedundant(alias: string, name: string): boolean {
  const a = normalise(alias);
  const n = normalise(name);
  if (!a) return true;
  if (a === n) return true;
  // Compare as whole-word phrases so "cane" does not knock out "evaporated cane juice".
  return n.startsWith(`${a} `) || n.endsWith(` ${a}`) || n.includes(` ${a} `);
}

/**
 * Pick the first alias that is neither a stop word nor a repeat of the card's own name.
 * Returns null when the card has nothing worth printing.
 */
export function pickAlias(aliases: string[], name: string): string | null {
  for (const alias of aliases) {
    const key = normalise(alias);
    if (USELESS_ALIASES.has(key)) continue;
    if (isRedundant(alias, name)) continue;
    return alias;
  }
  return null;
}

/**
 * Print an alias for a card: known abbreviations in capitals, everything else in the data's own
 * casing with a capital first letter. Words that are already all-caps are left alone.
 */
export function formatAlias(alias: string): string {
  const capital = CAPITALISE.get(normalise(alias));
  if (capital) return capital;
  // Keep interior capitals the data chose (e.g. "D-tagatose"); only lift the first character.
  return alias.charAt(0).toUpperCase() + alias.slice(1);
}

/**
 * The name printed on a card: the data's string with a capital first letter.
 */
export function formatName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * The "Also listed as" line for a card, or null when there is nothing worth showing.
 * `alias` is the printed name the card is built from; `others` is the rest of the data's aliases.
 */
export function alsoListedAs(others: string[], name: string): string | null {
  const picked = pickAlias(others, name);
  return picked ? formatAlias(picked) : null;
}
