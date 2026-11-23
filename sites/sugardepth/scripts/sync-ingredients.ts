// Writes src/data/ingredients.generated.json from the scanner's registry and rules (see ingredient-pages.ts).
// Run from the repo root: `npm run ingredients`. `--check` fails if the file is out of date.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildIngredientData, serialize } from './ingredient-pages.ts';

const out = fileURLToPath(new URL('../src/data/ingredients.generated.json', import.meta.url));
const json = serialize(buildIngredientData());
if (process.argv.includes('--check')) {
  if (!existsSync(out) || readFileSync(out, 'utf8') !== json) {
    console.error('sites/sugardepth/src/data/ingredients.generated.json is out of date with the registry or rules. Run `npm run ingredients`.');
    process.exit(1);
  }
  console.log('Ingredient pages in sync with the registry.');
} else {
  writeFileSync(out, json);
  console.log(`Wrote ${out}`);
}
