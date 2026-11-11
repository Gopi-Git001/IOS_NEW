// /llms.txt: a short plain-text map of the site for AI answer engines (llmstxt.org convention). The verdict lines
// and the mission are the same data the pages print (src/data/rules.ts, src/data/mission.ts), not a second copy.
import type { APIRoute } from 'astro';
import { SITE_NAME, abs } from '../config';
import { getFeaturedGuides } from '../data/guides';
import { ADDED_SUGAR_ALIAS_COUNT } from '../data/ingredients';
import { MISSION } from '../data/mission';
import { VERDICTS } from '../data/rules';

const plain = (s: string) => s.replace(/\u00a0/g, ' ');
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const link = (label: string, path: string, note?: string) => `- [${label}](${abs(path)})${note ? `: ${note}` : ''}`;

export const GET: APIRoute = async () => {
  const guides = await getFeaturedGuides();
  const lines = [
    `# ${SITE_NAME}`,
    '',
    '> Sugar Depth is a food-label scanner: photograph an ingredient list and get one verdict, CLEAN, OKAY or BAD, based on added sugars and sweeteners.',
    '',
    `Mission: ${MISSION}`,
    '',
    '## What it is',
    '',
    '- It reads the ingredient list printed on a package from a photo. No barcodes, no product database.',
    "- Verdicts are Sugar Depth's preferences, not medical advice. It does not check allergens.",
    '',
    '## Verdicts',
    '',
    'The worst ingredient decides.',
    '',
    ...VERDICTS.map((v) => plain(`- ${v.word}: ${v.rules.map(lowerFirst).join('; ')}.`)),
    '',
    '## Key pages',
    '',
    link('How verdicts work', '/how-it-works', 'the full rule table'),
    link('Hidden sugar names', '/hidden-sugar-names', `all ${ADDED_SUGAR_ALIAS_COUNT} added-sugar names`),
    link('Ingredients', '/ingredients', 'every ingredient the scanner knows'),
    link('FAQ', '/faq', 'short answers'),
    link('Privacy', '/privacy', 'what happens to photos'),
    '',
    '## Ingredient guides',
    '',
    ...guides.map((g) => link(g.name, `/ingredients/${g.slug}`)),
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
