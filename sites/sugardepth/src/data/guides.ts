// One list of every /ingredients/<slug> page: a page per registry entry (generated), with the hand-written
// guide for that entry laid over it where one exists, plus guides about a single alias (evaporated cane juice).
// Facts always come from the registry; a guide that disagrees with it fails the build here.
import { getCollection, type CollectionEntry } from 'astro:content';
import { answerFor, PAGES, pageById, pageBySlug, tagFor, type IngredientPage } from './ingredients';
import { S, type SourceKey } from './sources';

export type Guide = {
  slug: string;
  name: string;
  title: string;
  /**
   * The one sentence under the H1: is it sugar, and what verdict it gets. It names the ingredient, so it can be
   * quoted alone. The meta description and the JSON-LD description are this same sentence.
   */
  answer: string;
  /** Meta description. Always the answer. */
  description: string;
  /** The line on a card (/ingredients, home page): six words at most. */
  tag: string;
  /** Same as `tag`; kept for the pages that read `summary`. */
  summary: string;
  /** The registry entry this page is about. */
  page: IngredientPage;
  /** Names to print, with the guide's casing where it gives one. */
  aliases: string[];
  codes: string[];
  related: string[];
  sources: SourceKey[];
  /** The hand-written guide, when there is one. */
  doc?: CollectionEntry<'ingredients'>;
  /** True for a guide about one alias of an entry rather than the entry itself. */
  aliasGuide: boolean;
};

const fail = (file: string, msg: string): never => {
  throw new Error(`src/content/ingredients/${file}.mdx: ${msg}`);
};

function sourceKeys(keys: string[], where: string): SourceKey[] {
  for (const k of keys) if (!(k in S)) throw new Error(`${where}: unknown source "${k}" (see src/data/sources.ts)`);
  return [...new Set(keys)] as SourceKey[];
}

/** Longest answer sentence (it is also the meta description) and longest card tag. */
export const MAX_ANSWER_CHARS = 155;
export const MAX_TAG_WORDS = 6;

/** A hand-written guide's `description` is its answer sentence and its `summary` is its card tag. */
function copyOf(doc: CollectionEntry<'ingredients'>) {
  const answer = doc.data.description.trim();
  const tag = doc.data.summary.trim();
  if (answer.length > MAX_ANSWER_CHARS) fail(doc.id, `description is the one-sentence answer and the meta description: ${answer.length} characters, the limit is ${MAX_ANSWER_CHARS}`);
  if (tag.split(/\s+/).length > MAX_TAG_WORDS) fail(doc.id, `summary is the card tag: at most ${MAX_TAG_WORDS} words`);
  return { answer, description: answer, tag, summary: tag };
}

let cache: Promise<Guide[]> | undefined;
export const getGuides = () => (cache ??= build());

async function build(): Promise<Guide[]> {
  const docs = await getCollection('ingredients');
  const primary = new Map<string, CollectionEntry<'ingredients'>>();
  const aliasDocs: CollectionEntry<'ingredients'>[] = [];
  for (const doc of docs) {
    const page = pageById(doc.data.entry) ?? fail(doc.id, `entry "${doc.data.entry}" is not in the ingredient registry`);
    if (doc.id === page.slug) {
      if (doc.data.name || doc.data.aliases) fail(doc.id, 'a guide for a registry entry takes its name and aliases from the registry; remove them');
      primary.set(page.id, doc);
    } else {
      if (pageBySlug(doc.id)) fail(doc.id, `the file name is the slug of another registry entry, but entry is "${page.id}"`);
      if (!doc.data.name || !doc.data.aliases?.length) fail(doc.id, 'a guide about one alias needs name and aliases');
      aliasDocs.push(doc);
    }
  }

  // Print a registry name with the guide's casing. Anything that isn't a registry name fails.
  const cased = (doc: CollectionEntry<'ingredients'>, page: IngredientPage) => {
    const known = new Set([...page.aliases, ...page.codes.map((c) => c.toLowerCase())]);
    const map = new Map<string, string>();
    for (const c of doc.data.casing) {
      if (!known.has(c.toLowerCase())) fail(doc.id, `casing "${c}" is not a registry alias or code of ${page.id}`);
      map.set(c.toLowerCase(), c);
    }
    return (name: string) => map.get(name.toLowerCase()) ?? name;
  };

  const guides: Guide[] = PAGES.map((page) => {
    const doc = primary.get(page.id);
    if (!doc) {
      return {
        slug: page.slug, name: page.name, title: page.title, answer: answerFor(page), description: answerFor(page), tag: tagFor(page), summary: tagFor(page), page,
        aliases: page.aliases, codes: page.codes, related: page.related, sources: sourceKeys(page.sources, page.id), aliasGuide: false,
      };
    }
    const print = cased(doc, page);
    return {
      slug: page.slug, name: page.name, title: doc.data.title, ...copyOf(doc), page,
      aliases: page.aliases.map(print), codes: page.codes.map(print),
      related: [...new Set([...doc.data.related, ...page.related])].slice(0, 6),
      sources: sourceKeys([...doc.data.sources, ...page.sources], doc.id), doc, aliasGuide: false,
    };
  });

  for (const doc of aliasDocs) {
    const page = pageById(doc.data.entry)!;
    const print = cased(doc, page);
    for (const a of doc.data.aliases!) {
      if (!page.aliases.includes(a.toLowerCase())) fail(doc.id, `"${a}" is not a registry alias of ${page.id}`);
    }
    guides.push({
      slug: doc.id, name: doc.data.name!, title: doc.data.title, ...copyOf(doc), page,
      aliases: doc.data.aliases!.map((a) => print(a.toLowerCase())), codes: [],
      related: [...new Set([page.slug, ...doc.data.related])],
      sources: sourceKeys([...doc.data.sources, ...page.sources], doc.id), doc, aliasGuide: true,
    });
  }

  const slugs = new Set(guides.map((g) => g.slug));
  for (const g of guides) for (const r of g.related) if (!slugs.has(r)) throw new Error(`${g.slug}: related guide "${r}" does not exist`);
  return guides;
}

/** The hand-written guides, in their own order (home page and footer). */
export const getFeaturedGuides = async () =>
  (await getGuides()).filter((g) => g.doc).sort((a, b) => a.doc!.data.order - b.doc!.data.order);
