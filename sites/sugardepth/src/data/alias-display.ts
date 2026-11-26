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

/** Words too generic to prove two aliases describe the same ingredient. */
const GENERIC_WORDS = new Set(['sugar', 'syrup', 'extract', 'powder', 'solids', 'juice', 'concentrate', 'of', 'the', 'and']);

/** The meaningful words in a name, lowercased, for the synonym test below. */
function meaningfulWords(value: string): Set<string> {
  return new Set(
    normalise(value)
      .split(' ')
      .filter((w) => w && !GENERIC_WORDS.has(w)),
  );
}

/**
 * True when `alias` looks like another printed name for the SAME ingredient rather than merely
 * another entry in the same classification group.
 *
 * The registry groups every name that the scanner classifies alike — so plain "sugar" also lists
 * cane sugar, coconut sugar, date sugar, maple sugar and invert sugar. Those are different sugars,
 * not synonyms, and printing "Also listed as Cane sugar" on a Coconut sugar card is wrong.
 * Requiring one shared meaningful word keeps genuine synonyms ("coconut sugar" -> "coconut palm
 * sugar") while rejecting neighbours that share only the group word "sugar".
 */
function sharesIngredientWord(alias: string, name: string): boolean {
  const aliasWords = meaningfulWords(alias);
  if (aliasWords.size === 0) return false;
  for (const word of meaningfulWords(name)) {
    if (aliasWords.has(word)) return true;
  }
  return false;
}

/**
 * Pick the best alias for a card. Preference order:
 *   1. an alias that shares a meaningful word with the card's own name (a real synonym),
 *   2. otherwise the first alias that is not a stop word or a repeat of the name.
 * Returns null when nothing worth printing remains.
 */
export function pickAlias(aliases: string[], name: string): string | null {
  const usable = aliases.filter((alias) => !USELESS_ALIASES.has(normalise(alias)) && !isRedundant(alias, name));
  if (usable.length === 0) return null;
  // A known abbreviation is the best possible "also listed as" line: short and familiar.
  const abbreviation = usable.find((alias) => CAPITALISE.has(normalise(alias)));
  if (abbreviation) return abbreviation;
  // Otherwise prefer a genuine synonym, so a card never advertises a different sugar as its alternate.
  const synonym = usable.find((alias) => sharesIngredientWord(alias, name));
  return synonym ?? usable[0];
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
