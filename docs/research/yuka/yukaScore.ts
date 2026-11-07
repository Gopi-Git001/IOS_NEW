// Reference reconstruction of Yuka's food score, built only from Yuka's public help pages and the
// Santé publique France Nutri-Score rules (original 2017 algorithm, which Yuka says it still uses).
// Provenance: documentation-based. Not checked against the Yuka app. Not wired into QuickGOB.
// See ./YUKA_SCORE.md for sources, confidence per rule, and open questions.

export type Risk = 'green' | 'yellow' | 'orange' | 'red';
export type Category = 'general' | 'beverage' | 'water' | 'cheese' | 'fat';

export type Per100 = {
  energyKj: number;
  sugarsG: number;
  saturatedFatG: number;
  /** Total fat, needed only for the `fat` category (saturated/total ratio). */
  fatG?: number;
  sodiumMg: number; // if only salt is given: sodium mg = salt g × 400 (salt ÷ 2.5)
  fiberG: number;
  proteinG: number;
  /** Fruits, vegetables, legumes, nuts, rapeseed/walnut/olive oil, % by weight. Yuka estimates when absent. */
  fruitVegPct: number;
};

export type YukaInput = {
  category: Category;
  /** Per 100 g, or per 100 mL for beverages; for products made with water or milk, use values as prepared. */
  per100: Per100;
  additives: Risk[];
  organic: boolean;
};

// ---------- Nutri-Score (original algorithm) ----------
// Each array holds the lower bounds for 1..10 (or 1..5) points; a value strictly above bound k earns k+1 points.
const ENERGY = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
const SUGARS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
const SAT_FAT = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SODIUM = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
const PROTEIN = [1.6, 3.2, 4.8, 6.4, 8.0];
const FIBER = [0.9, 1.9, 2.8, 3.7, 4.7];
// Beverages: 0 points only at ≤ 0, then steps; "≤ bound" stays at that step.
const BEV_ENERGY = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
const BEV_SUGARS = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5];
// Fats category: saturated fat / total fat (%), 0 points below 10, +1 per 6 points, 10 at ≥ 64.
const SAT_RATIO = [10, 16, 22, 28, 34, 40, 46, 52, 58, 64];

const above = (v: number, bounds: number[]) => bounds.filter((b) => v > b).length;
const atLeast = (v: number, bounds: number[]) => bounds.filter((b) => v >= b).length;

function fruitPoints(pct: number, beverage: boolean): number {
  if (beverage) return pct > 80 ? 10 : pct > 60 ? 4 : pct > 40 ? 2 : 0;
  return pct > 80 ? 5 : pct > 60 ? 2 : pct > 40 ? 1 : 0;
}

export type NutriScore = { points: number; letter: 'A' | 'B' | 'C' | 'D' | 'E'; n: number; p: number };

export function nutriScore(category: Category, x: Per100): NutriScore {
  if (category === 'water') return { points: -15, letter: 'A', n: 0, p: 0 };
  const bev = category === 'beverage';
  const energy = bev ? above(x.energyKj, BEV_ENERGY) : above(x.energyKj, ENERGY);
  const sugars = bev ? above(x.sugarsG, BEV_SUGARS) : above(x.sugarsG, SUGARS);
  const sat =
    category === 'fat' && x.fatG && x.fatG > 0
      ? atLeast((x.saturatedFatG / x.fatG) * 100, SAT_RATIO)
      : above(x.saturatedFatG, SAT_FAT);
  const sodium = above(x.sodiumMg, SODIUM);
  const n = energy + sugars + sat + sodium;

  const fruit = fruitPoints(x.fruitVegPct, bev);
  const fiber = above(x.fiberG, FIBER);
  const protein = above(x.proteinG, PROTEIN);
  const fruitMax = bev ? 10 : 5;
  const countProtein = n < 11 || category === 'cheese' || fruit >= fruitMax;
  const p = fruit + fiber + (countProtein ? protein : 0);
  const points = n - p;

  const letter = bev
    ? points <= 1 ? 'B' : points <= 5 ? 'C' : points <= 9 ? 'D' : 'E'
    : points <= -1 ? 'A' : points <= 2 ? 'B' : points <= 10 ? 'C' : points <= 18 ? 'D' : 'E';
  return { points, letter, n, p };
}

// ---------- Yuka correspondence table (help.yuka.io, "How is the Nutri-Score used to obtain the Yuka rating?") ----------
const SOLID: Record<number, number> = {
  [-3]: 100, [-2]: 100, [-1]: 90, 0: 80, 1: 75, 2: 70, 3: 65, 4: 60, 5: 55, 6: 50, 7: 45, 8: 40, 9: 35, 10: 30,
  11: 15, 12: 13, 13: 11, 14: 9, 15: 7, 16: 5, 17: 3, 18: 1,
};
const LIQUID: Record<number, number> = {
  [-3]: 77, [-2]: 74, [-1]: 71, 0: 68, 1: 65, 2: 57, 3: 49, 4: 41, 5: 33, 6: 15, 7: 11, 8: 7, 9: 3,
};

/** Yuka's nutrition sub-score on 0..100 (before the 60% weight). */
export function nutritionOutOf100(category: Category, points: number): number {
  if (category === 'water') return 100; // ASSUMPTION: waters are Nutri-Score A; table has no water row.
  if (category === 'beverage') return points < -3 ? 80 : points > 9 ? 0 : LIQUID[points];
  return points < -3 ? 100 : points > 18 ? 0 : SOLID[points];
}

// ---------- Additives (help.yuka.io, "Additives' evaluation methodology") ----------
const PENALTY: Record<Risk, number> = { green: 0, yellow: 6, orange: 15, red: 30 };

export type YukaScore = {
  score: number;
  rating: 'Excellent' | 'Good' | 'Poor' | 'Bad';
  nutri: NutriScore;
  parts: { nutrition: number; additives: number; organic: number };
  capped: boolean;
};

export function yukaScore(input: YukaInput): YukaScore {
  const nutri = nutriScore(input.category, input.per100);
  const nutrition = (nutritionOutOf100(input.category, nutri.points) * 60) / 100;
  // ASSUMPTION: penalties add up and the additive part floors at 0 (Yuka lists points "per additive").
  const additives = Math.max(0, 30 - input.additives.reduce((s, r) => s + PENALTY[r], 0));
  const organic = input.organic ? 10 : 0;
  let score = nutrition + additives + organic;
  const hasRed = input.additives.includes('red');
  // Stated caps: a red additive, or a Nutri-Score D/E, keeps the product at or below 49.
  const capped = (hasRed || nutri.letter === 'D' || nutri.letter === 'E') && score > 49;
  if (capped) score = 49;
  score = Math.round(score); // ASSUMPTION: Yuka shows whole numbers; rounding rule not published.
  const rating = score >= 75 ? 'Excellent' : score >= 50 ? 'Good' : score >= 25 ? 'Poor' : 'Bad';
  return { score, rating, nutri, parts: { nutrition, additives, organic }, capped };
}
