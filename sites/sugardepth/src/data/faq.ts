// The FAQ, written once: /faq renders its questions and answers from this list and nowhere else. Each answer gives
// the direct answer first, in at most two sentences. `a` is HTML (links only). The page ships no FAQPage JSON-LD
// (a choice made when the site was first built); if that changes, build it from this same list so the two match.
import { MAX_OKAY_ADDED_G as G } from './ingredients';

export type Faq = { id: string; q: string; a: string };

const g = `${G}&nbsp;g`;

export const FAQ: Faq[] = [
  {
    id: 'what',
    q: 'What is Sugar Depth?',
    a: 'A food-label scanner. Photograph an ingredient list and get one verdict on added sugar and sweeteners: CLEAN, OKAY or BAD.',
  },
  {
    id: 'barcode',
    q: 'Does it scan barcodes?',
    a: 'No, it reads the ingredient list printed on the package. There is no product database.',
  },
  {
    id: 'zero-grams',
    q: 'Why isn\'t a 0&nbsp;g sugar label CLEAN?',
    a: 'Because sweeteners aren\'t sugar, and US labels may round under 0.5&nbsp;g down to 0&nbsp;g. An artificial sweetener like <a href="/ingredients/sucralose">sucralose</a> is BAD; a listed added sugar printed as 0&nbsp;g is OKAY.',
  },
  {
    id: 'little',
    q: 'How much added sugar is OKAY?',
    a: `${g} or less per serving. More than ${g} is BAD, and so is added sugar whose grams per serving can't be read.`,
  },
  {
    id: 'stevia',
    q: 'Why is stevia OKAY, not CLEAN?',
    a: 'Because it\'s still a sweetener. <a href="/ingredients/stevia">Stevia</a>, <a href="/ingredients/monk-fruit">monk fruit</a>, <a href="/ingredients/thaumatin">thaumatin</a>, <a href="/ingredients/allulose">allulose</a> and sugar alcohols like <a href="/ingredients/erythritol">erythritol</a> are OKAY: not added sugar, but added for sweetness.',
  },
  {
    id: 'fruit',
    q: 'Does sugar from fruit or milk count?',
    a: 'No, sugar that comes with milk, yogurt, fruit, single-strength juice or fruit puree is allowed in CLEAN. <a href="/ingredients/juice-concentrate">Juice concentrate</a> and lactose listed as its own ingredient are added sugar.',
  },
  {
    id: 'maltodextrin',
    q: 'Is maltodextrin sugar?',
    a: 'No, <a href="/ingredients/maltodextrin">maltodextrin</a> is a nonsweet starch polymer under federal rules, and it\'s allowed in CLEAN.',
  },
  {
    id: 'medical',
    q: 'Is this medical advice?',
    a: 'No, the verdicts are Sugar Depth\'s preferences about sweeteners, not medical or safety findings. Ask a clinician about your own diet.',
  },
  {
    id: 'allergens',
    q: 'Does it check allergens?',
    a: 'No, it only looks for sugars and sweeteners. Always check the label yourself for allergens.',
  },
  {
    id: 'photos',
    q: 'What happens to my photo?',
    a: 'It goes to Sugar Depth\'s backend and to AI services that read the label text and return a verdict. The <a href="/privacy">privacy policy</a> says what is kept and for how long.',
  },
  {
    id: 'wrong',
    q: 'I got a wrong verdict. What now?',
    a: '<a href="/contact">Email a photo of the ingredient list</a> and the verdict you got. Missing ingredient names get added to the registry.',
  },
];
