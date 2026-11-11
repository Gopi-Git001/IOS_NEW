// Hand-written lines for /hidden-sugar-names, keyed by registry id. The names themselves, the groups and the
// count come from the registry (src/data/ingredients.ts), not from here.
import { PAGES, type IngredientPage } from './ingredients';

export type SugarCopy = { heading?: string; blurb: string };

/** One line per group, six words at most. */
const COPY: Record<string, SugarCopy> = {
  sugar: { heading: 'Sugar (sucrose and cane or beet sugars)', blurb: 'Table sugar and its many costumes.' },
  dextrose: { heading: 'Dextrose (glucose)', blurb: 'Pure glucose, usually made from corn.' },
  fructose: { blurb: 'Fruit sugar, added on its own.' },
  maltose: { blurb: 'Malt sugar.' },
  trehalose: { blurb: 'A sugar of two glucose units.' },
  galactose: { blurb: 'A simple sugar, added alone.' },
  lactose_added: { heading: 'Lactose (listed on its own)', blurb: 'Milk sugar sold as an ingredient.' },
  honey: { blurb: 'Natural, and still added sugar.' },
  maple_syrup: { blurb: 'Tree sap boiled down to sugar.' },
  agave: { blurb: 'A syrup that is mostly fructose.' },
  corn_syrup: { blurb: 'Corn starch broken down into syrup.' },
  hfcs: { blurb: 'Corn syrup, partly turned into fructose.' },
  rice_syrup: { heading: 'Rice syrup and other grain, root and fruit syrups', blurb: 'Starch or fruit turned into syrup.' },
  malt_syrup: { blurb: 'Sugar made from sprouted grain.' },
  juice_concentrate: { blurb: 'Juice boiled down to its sugar.' },
  // Tagatose, isomaltulose and IMO have no line here: the page prints the registry note for them instead.
};

/** Every registry entry treated as added sugar, with its line of copy where one is written. */
export const ADDED_SUGARS: { page: IngredientPage; heading: string; blurb?: string }[] = PAGES
  .filter((p) => p.treatment === 'added_sugar')
  .map((page) => ({ page, heading: COPY[page.id]?.heading ?? page.name, blurb: COPY[page.id]?.blurb }));

for (const id of Object.keys(COPY)) {
  if (!ADDED_SUGARS.some((g) => g.page.id === id)) throw new Error(`src/data/sugars.ts: "${id}" is not an added sugar in the ingredient registry`);
  if (COPY[id].blurb.split(/\s+/).length > 6) throw new Error(`src/data/sugars.ts: the line for "${id}" is longer than six words`);
}
