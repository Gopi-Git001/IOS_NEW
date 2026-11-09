// Stage 2: normalization. Turns the literal ingredient text into a tree of items and resolves each
// item against the registry by exact normalized key. Never guesses: anything not in the registry
// stays unresolved. Pure functions, deterministic.
import {
  type Entry,
  isSweetenerCode,
  JUICE_CONCENTRATE,
  juiceEntries,
  lookupAlias,
  lookupCode,
  NOT_FROM_CONCENTRATE,
  SINGLE_STRENGTH_JUICE,
  SWEET_SIGNAL,
} from './ingredients.ts';

export type ParsedItem = {
  /** Exactly as printed (trimmed), for display and audit. */
  literal: string;
  /** Normalized match key. */
  key: string;
  children: ParsedItem[];
};

export type Resolved = {
  literal: string;
  key: string;
  /** Parent literals, outermost first, e.g. ["Stevia Blend"] for an item inside "Stevia Blend (...)". */
  path: string[];
  entry: Entry | null;
  /** How it was matched. */
  via: 'alias' | 'code' | 'juice_rule' | 'additive_code' | 'none';
  /** True when an unmatched item has wording that hints it might sweeten. */
  sweetSignal: boolean;
};

const OPEN = '([{';
const CLOSE = ')]}';

/** Leading phrases that introduce a sub-list rather than name an ingredient. */
const LEAD_INS = [
  /^ingredients?\s*:\s*/,
  /^contains\s+(?:\d+(?:\.\d+)?\s*%|two percent|2 percent)\s+or\s+less\s+of\s*(?:each of\s+)?(?:the following\s*)?:?\s*/,
  /^(?:contains\s+)?(?:less than|<)\s*\d+(?:\.\d+)?\s*%\s+of\s*(?:each of\s+)?(?:the following\s*)?:?\s*/,
  /^contains one or more of the following\s*:?\s*/,
  /^and\/or\s+/,
  /^and\s+/,
];

/** Removes "Ingredients:", "Contains 2% or less of:" and similar from the start of an item. */
export function stripLeadIns(text: string): string {
  let s = text.trim();
  for (let changed = true; changed; ) {
    changed = false;
    for (const re of LEAD_INS) {
      const next = s.replace(new RegExp(re.source, 'i'), '');
      if (next !== s) {
        s = next.trim();
        changed = true;
      }
    }
  }
  return s;
}

/** Qualifier words that do not change identity. Stripped only when the exact key has no match. */
const MODIFIERS = ['certified organic', 'organic', 'non-gmo', 'non gmo', 'natural', 'pure', 'unrefined', 'unsulphured', 'unsulfured', 'fair trade', 'dried', 'filtered'];

/** Lowercase, strip diacritics, footnote marks, percentages and extra spaces. Keeps hyphens and slashes. */
export function normalizeKey(text: string): string {
  let s = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  s = s.replace(/[*†‡§¹²³]/g, ' ');
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u2010-\u2015]/g, '-');
  s = stripLeadIns(s);
  s = s.replace(/\b\d+(?:\.\d+)?\s*%/g, ' ');
  s = s.replace(/^[\s.:;,]+|[\s.:;,]+$/g, '');
  return s.replace(/\s+/g, ' ').trim();
}

/** "E 955", "e-955", "INS 955", "INS955" -> "e955". Null when it isn't a code. */
export function codeOf(key: string): string | null {
  const m = key.match(/^(?:e|ins)\s*-?\s*(\d{3,4}[a-z]?)$/);
  return m ? `e${m[1]}` : null;
}

/** Splits at top-level commas/semicolons and parses (), [] and {} into child lists. */
export function parseIngredients(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  let i = 0;
  const src = text.replace(/\r?\n/g, ' ');

  function parseList(closer: string | null): ParsedItem[] {
    const list: ParsedItem[] = [];
    let buf = '';
    let children: ParsedItem[] = [];
    const flush = () => {
      const literal = stripLeadIns(buf.replace(/\s+/g, ' ').trim()).replace(/^[.:]+|[.:]+$/g, '').trim();
      if (literal || children.length) list.push(...expand(literal, children));
      buf = '';
      children = [];
    };
    while (i < src.length) {
      const ch = src[i];
      if (OPEN.includes(ch)) {
        i++;
        children.push(...parseList(CLOSE[OPEN.indexOf(ch)]));
        continue;
      }
      if (CLOSE.includes(ch)) {
        i++;
        if (closer) {
          flush();
          return list;
        }
        continue; // stray closer: ignore
      }
      // A period followed by a space ends a sentence-like segment ("...Salt. Contains: Milk").
      if (ch === ',' || ch === ';' || (ch === '.' && /\s/.test(src[i + 1] ?? ' ') && !/\d/.test(src[i - 1] ?? ''))) {
        i++;
        flush();
        continue;
      }
      buf += ch;
      i++;
    }
    flush();
    return list;
  }

  items.push(...parseList(null));
  return items.filter((it) => it.key || it.children.length);
}

/**
 * "Sugar and/or Dextrose" -> two items. "Sugar and Salt" splits only when every part is a known
 * ingredient, so "Mono and Diglycerides" stays whole.
 */
function expand(literal: string, children: ParsedItem[]): ParsedItem[] {
  const key = normalizeKey(literal);
  const parts = literal.split(/\s+and\/or\s+/i);
  if (parts.length > 1) return parts.flatMap((p, idx) => expand(p, idx === parts.length - 1 ? children : []));
  if (/\s+and\s+/i.test(literal) && !matchEntry(key).entry) {
    const andParts = literal.split(/\s+and\s+/i);
    if (andParts.length > 1 && andParts.every((p) => matchEntry(normalizeKey(p)).entry)) {
      return andParts.map((p, idx) => ({ literal: p.trim(), key: normalizeKey(p), children: idx === andParts.length - 1 ? children : [] }));
    }
  }
  return [{ literal, key, children }];
}

/** Exact registry match on a normalized key, trying modifier-stripped forms only after the exact key fails. */
export function matchEntry(key: string): { entry: Entry | null; via: Resolved['via'] } {
  if (!key) return { entry: null, via: 'none' };
  const code = codeOf(key);
  if (code) {
    const hit = lookupCode(code);
    if (hit) return { entry: hit, via: 'code' };
    if (!isSweetenerCode(code)) return { entry: null, via: 'additive_code' };
    return { entry: null, via: 'none' };
  }
  const candidates = [key];
  let stripped = key;
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of MODIFIERS) {
      if (stripped.startsWith(`${m} `)) {
        stripped = stripped.slice(m.length + 1);
        candidates.push(stripped);
        changed = true;
      }
    }
  }
  for (const k of candidates) {
    const hit = lookupAlias(k);
    if (hit) return { entry: hit, via: 'alias' };
  }
  for (const k of candidates) {
    if (NOT_FROM_CONCENTRATE.test(k)) return { entry: juiceEntries.single, via: 'juice_rule' };
    if (/juice from concentrate$/.test(k)) return { entry: juiceEntries.reconstituted, via: 'juice_rule' };
    if (JUICE_CONCENTRATE.test(k)) return { entry: juiceEntries.concentrate, via: 'juice_rule' };
    if (SINGLE_STRENGTH_JUICE.test(k) && !/color$/.test(k)) return { entry: juiceEntries.single, via: 'juice_rule' };
  }
  return { entry: null, via: 'none' };
}

/** Unknown wording that hints at a sweetener, or an unknown code in the EU sweetener range. */
const maySweeten = (key: string) => {
  const code = codeOf(key);
  return code ? isSweetenerCode(code) : SWEET_SIGNAL.test(key);
};

/**
 * Flattens the tree into resolved items. A parent that matches the registry keeps its own identity
 * and treats unmatched children as qualifiers ("Sugar (Cane)"). A parent that does not match is a
 * compound ("Chocolate Chips (Sugar, Cocoa)"): only its children are classified.
 */
export function resolveAll(items: ParsedItem[], path: string[] = []): Resolved[] {
  const out: Resolved[] = [];
  for (const it of items) {
    const own = matchEntry(it.key);
    const kids = it.children.length ? resolveAll(it.children, [...path, it.literal]) : [];
    if (own.entry || own.via === 'additive_code') {
      out.push({ literal: it.literal, key: it.key, path, entry: own.entry, via: own.via, sweetSignal: false });
      // Keep children that are themselves known (e.g. "Stevia Blend" is not known, but
      // "Sweetener (Sucralose)" should surface sucralose). Unknown children of a known parent are qualifiers.
      out.push(...kids.filter((k) => k.entry || k.via === 'additive_code'));
    } else if (it.children.length) {
      // Compound: classify by children. The compound name itself is only a concern if it
      // signals sweetness AND none of its children explain it.
      const explained = kids.some((k) => k.entry);
      if (it.key && !explained) {
        // Unexplained compound: report the ingredient itself; its unknown children are likely notes
        // like "(To Protect Taste)", so only keep children that are known or may sweeten.
        out.push({ literal: it.literal, key: it.key, path, entry: null, via: 'none', sweetSignal: maySweeten(it.key) });
        out.push(...kids.filter((k) => k.entry || k.sweetSignal || k.via === 'additive_code'));
      } else {
        out.push(...kids);
      }
    } else if (it.key) {
      out.push({ literal: it.literal, key: it.key, path, entry: null, via: 'none', sweetSignal: maySweeten(it.key) });
    }
  }
  return out;
}
