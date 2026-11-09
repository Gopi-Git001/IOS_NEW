// Government sources. Most are already cited in RULES.md / ingredients.ts on the scanner branch.
export type Source = { title: string; publisher: string; url: string };

export const S = {
  addedSugarsRule: {
    title: 'Changes to the Nutrition Facts Label (added sugars, 21 CFR 101.9(c)(6)(iii))',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/changes-nutrition-facts-label',
  },
  addedSugarsQA: {
    title: 'Nutrition and Supplement Facts Labels: Questions and Answers Related to the Compliance Date, Added Sugars, and Declaration of Quantitative Amounts of Vitamins and Minerals',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/media/117402/download',
  },
  allulose: {
    title: 'The Declaration of Allulose and Calories from Allulose on Nutrition and Supplement Facts Labels: Guidance for Industry',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/media/123342/download',
  },
  rareSugars: {
    title: 'Sugars That Are Metabolized Differently Than Traditional Sugars (2020)',
    publisher: 'Federal Register',
    url: 'https://www.federalregister.gov/documents/2020/10/19/2020-22900/sugars-that-are-metabolized-differently-than-traditional-sugars',
  },
  maltodextrin: {
    title: '21 CFR 184.1444 Maltodextrin',
    publisher: 'Electronic Code of Federal Regulations (eCFR)',
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-184/subpart-B/section-184.1444',
  },
  fiber: {
    title: 'Questions and Answers on Dietary Fiber',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-dietary-fiber',
  },
  sweeteners: {
    title: 'Aspartame and Other Sweeteners in Food',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/food/food-additives-petitions/aspartame-and-other-sweeteners-food',
  },
  ecj: {
    title: 'Guidance for Industry: Ingredients Declared as Evaporated Cane Juice (May 2016)',
    publisher: 'U.S. Food and Drug Administration',
    url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-ingredients-declared-evaporated-cane-juice',
  },
  nutritionLabel: {
    title: '21 CFR 101.9 Nutrition labeling of food',
    publisher: 'Electronic Code of Federal Regulations (eCFR)',
    url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.9',
  },
} satisfies Record<string, Source>;

export type SourceKey = keyof typeof S;
