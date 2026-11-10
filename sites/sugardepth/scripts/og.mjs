// Generates public/og/default.png (1200x630) and the favicons. Run manually (`npm run og`) and commit the output;
// it is not part of the build. resvg needs TTF/OTF, so convert the @fontsource .woff files first, e.g.
//   python3 -c "from fontTools.ttLib import TTFont as T; f=T('in.woff'); f.flavor=None; f.save('out.ttf')"
// and point OG_FONT_DIR at the folder (Libre Franklin 600 + 900, Newsreader 400 italic).
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const pub = new URL('../public/', import.meta.url).pathname;
mkdirSync(pub, { recursive: true });
const nm = new URL('../node_modules/', import.meta.url).pathname;
const fontDir = process.env.OG_FONT_DIR;
if (!fontDir || !existsSync(fontDir)) throw new Error('Set OG_FONT_DIR to a folder of TTF fonts (see the comment at the top).');
const fontFiles = readdirSync(fontDir).filter((f) => /\.(ttf|otf)$/.test(f)).map((f) => join(fontDir, f));

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="a" cx="12%" cy="10%" r="60%"><stop offset="0" stop-color="#FF7A66" stop-opacity=".32"/><stop offset="1" stop-color="#FF7A66" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="88%" cy="100%" r="60%"><stop offset="0" stop-color="#5BE49B" stop-opacity=".2"/><stop offset="1" stop-color="#5BE49B" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#06080D"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <text x="80" y="150" font-family="Libre Franklin Black" font-weight="900" font-size="92" fill="#F4F6FB" letter-spacing="-3">Sugar Depth</text>
  <rect x="80" y="172" width="560" height="10" fill="#F4F6FB"/>
  <text x="80" y="262" font-family="Newsreader" font-style="italic" font-size="48" fill="#F4F6FB">Read the fine print.</text>
  <rect x="80" y="330" width="1040" height="5" fill="#F4F6FB"/>
  <text x="80" y="420" font-family="Libre Franklin Black" font-weight="900" font-size="56" fill="#F4F6FB" letter-spacing="-1">Evaporated cane juice?</text>
  <text x="80" y="492" font-family="Libre Franklin Black" font-weight="900" font-size="56" fill="#FF7A66" letter-spacing="-1">That's sugar.</text>
  <rect x="80" y="540" width="1040" height="1" fill="#F4F6FB" fill-opacity=".34"/>
  <text x="80" y="586" font-family="Libre Franklin SemiBold" font-weight="600" font-size="26" fill="#F4F6FB" fill-opacity=".8">Food-label scanner · <tspan fill="#5BE49B" font-family="Libre Franklin Black" font-weight="900">CLEAN</tspan>  <tspan fill="#FFC24D" font-family="Libre Franklin Black" font-weight="900">OKAY</tspan>  <tspan fill="#FF7A66" font-family="Libre Franklin Black" font-weight="900">BAD</tspan></text>
</svg>`;

// Favicon: a heavy "S" between panel rules on the dark base, with a coral sugar cube on the baseline.
const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#06080D"/>
  <rect x="12" y="10" width="40" height="4" fill="#F4F6FB"/>
  <text x="32" y="49" text-anchor="middle" font-family="Libre Franklin Black" font-weight="900" font-size="40" fill="#F4F6FB">S</text>
  <rect x="12" y="52" width="40" height="2" fill="#F4F6FB"/>
  <rect x="44" y="44" width="8" height="8" rx="1.5" fill="#FF7A66"/>
</svg>`;

const render = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Libre Franklin Black' } }).render().asPng();

mkdirSync(join(pub, 'og'), { recursive: true });
// Default share image. The scanner app also references https://sugardepth.com/og/default.png; keep this path stable.
writeFileSync(join(pub, 'og', 'default.png'), render(og, 1200));
writeFileSync(join(pub, 'favicon-32.png'), render(fav, 32));
writeFileSync(join(pub, 'apple-touch-icon.png'), render(fav.replace('rx="14"', 'rx="0"'), 180));
// The SVG favicon can't rely on webfonts, so it uses the rendered glyph as a PNG fallback and a system-font SVG.
writeFileSync(join(pub, 'favicon.svg'), fav.replace('font-family="Libre Franklin Black"', 'font-family="Arial Black, Helvetica, Arial, sans-serif"'));
console.log('og.png + favicons written, fonts:', fontFiles.length);
