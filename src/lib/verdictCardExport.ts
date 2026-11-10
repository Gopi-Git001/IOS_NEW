import { colors, crystal, fonts } from '../theme';
import type { VerdictCardData } from './verdictCard';

export const VERDICT_CARD_SIZE = { width: 1080, height: 1350 } as const;

function font(ctx: CanvasRenderingContext2D, size: number, family = fonts.regular) {
  ctx.font = `${size}px "${family}", sans-serif`;
}

/** Fit hard-to-wrap names too; never let labels collide with another row. */
function wrapped(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, lineHeight: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const char of Array.from(value)) {
    if (ctx.measureText(line + char).width > width && line) {
      const space = line.lastIndexOf(' ');
      if (space > line.length / 2) { lines.push(line.slice(0, space)); line = line.slice(space + 1) + char; }
      else { lines.push(line); line = char; }
    } else line += char;
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines) {
    let last = visible[maxLines - 1];
    while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
    visible[maxLines - 1] = last.trimEnd() + '…';
  }
  visible.forEach((s, i) => ctx.fillText(s.trim(), x, y + i * lineHeight));
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
}

/** Purely procedural artwork: no remote image, label photo, DOM capture or server request. */
export async function createVerdictCardFile(data: VerdictCardData): Promise<File> {
  if (typeof document === 'undefined' || typeof File === 'undefined') throw new Error('Image sharing is available in the web app.');
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = VERDICT_CARD_SIZE.width;
  canvas.height = VERDICT_CARD_SIZE.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the image. Please try again.');
  const tint = crystal[data.verdict].tint;
  const deep = crystal[data.verdict].deep;
  ctx.fillStyle = colors.background; ctx.fillRect(0, 0, 1080, 1350);
  const light = ctx.createRadialGradient(900, 300, 0, 900, 300, 700);
  light.addColorStop(0, tint + '22'); light.addColorStop(1, tint + '00');
  ctx.fillStyle = light; ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = colors.hairline; ctx.globalAlpha = .25; ctx.lineWidth = 1;
  for (let x = 76; x < 1080; x += 116) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 1180); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.text; font(ctx, 52, fonts.black); ctx.fillText(data.brand, 76, 102);
  ctx.fillRect(76, 119, ctx.measureText(data.brand).width, 5);
  font(ctx, 25, fonts.bold); ctx.fillStyle = colors.inkMuted; ctx.fillText('THE LABEL VERDICT', 76, 179);

  let size = 174;
  font(ctx, size, fonts.black);
  while (ctx.measureText(data.verdict).width > 650) font(ctx, --size, fonts.black);
  const wordWidth = ctx.measureText(data.verdict).width;
  const gloss = ctx.createLinearGradient(0, 192, 0, 332);
  gloss.addColorStop(0, colors.text); gloss.addColorStop(.4, '#FFFFFF'); gloss.addColorStop(.48, '#A7ADA9'); gloss.addColorStop(.56, colors.text); gloss.addColorStop(1, '#C0C8C3');
  ctx.fillStyle = gloss; ctx.fillText(data.verdict, 70, 333);
  ctx.save(); ctx.beginPath(); ctx.rect(70, 352, 660, 78); ctx.clip();
  ctx.translate(0, 684); ctx.scale(1, -1); ctx.globalAlpha = .14; ctx.fillText(data.verdict, 70, 333); ctx.restore();
  const fade = ctx.createLinearGradient(0, 352, 0, 432);
  fade.addColorStop(0, colors.background + '00'); fade.addColorStop(1, colors.background);
  ctx.fillStyle = fade; ctx.fillRect(70, 352, 665, 80);
  const bead = ctx.createRadialGradient(89 + wordWidth, 313, 1, 94 + wordWidth, 319, 19);
  bead.addColorStop(0, '#FFFFFF'); bead.addColorStop(.22, tint); bead.addColorStop(1, deep);
  ctx.fillStyle = bead; ctx.beginPath(); ctx.arc(96 + wordWidth, 318, 18, 0, Math.PI * 2); ctx.fill();

  // The existing rectangular slab language: thick edge, inset rim, light bands and glint.
  ctx.save(); ctx.translate(848, 292); ctx.rotate(.075);
  ctx.shadowColor = tint + '55'; ctx.shadowBlur = 55;
  ctx.fillStyle = deep; rect(ctx, -76, -116, 170, 232, 18); ctx.fill();
  ctx.shadowBlur = 0;
  const glass = ctx.createLinearGradient(-85, -125, 75, 110);
  glass.addColorStop(0, tint); glass.addColorStop(.45, tint); glass.addColorStop(1, deep);
  ctx.fillStyle = glass; rect(ctx, -85, -125, 170, 232, 16); ctx.fill();
  ctx.save(); rect(ctx, -85, -125, 170, 232, 16); ctx.clip();
  ctx.fillStyle = '#FFFFFF22'; ctx.beginPath(); ctx.moveTo(-90, 85); ctx.lineTo(16, -135); ctx.lineTo(55, -135); ctx.lineTo(-56, 120); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFFFFF55'; ctx.beginPath(); ctx.moveTo(-25, 120); ctx.lineTo(78, -135); ctx.lineTo(85, -135); ctx.lineTo(-18, 120); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.strokeStyle = '#FFFFFF77'; ctx.lineWidth = 2; rect(ctx, -80, -120, 160, 222, 12); ctx.stroke();
  ctx.strokeStyle = '#FFFFFFDD'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(67, -112); ctx.lineTo(67, -88); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = colors.rule; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(76, 466); ctx.lineTo(1004, 466); ctx.stroke();
  ctx.fillStyle = colors.text; font(ctx, 42, fonts.serif); wrapped(ctx, data.headline, 76, 520, 928, 51, 2);
  font(ctx, 26, fonts.bold); ctx.fillStyle = colors.inkMuted; ctx.fillText('ADDED SUGARS & SWEETENERS', 76, 619);
  data.ingredients.forEach((ingredient, i) => {
    const y = 650 + i * 124;
    const row = ctx.createLinearGradient(76, y, 1004, y + 110);
    row.addColorStop(0, '#FFFFFF12'); row.addColorStop(.5, '#FFFFFF06'); row.addColorStop(1, '#FFFFFF10');
    ctx.fillStyle = row; rect(ctx, 76, y, 928, 112, 16); ctx.fill();
    ctx.strokeStyle = colors.hairline; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = ingredient.kind === 'ADDED SUGAR' ? colors.bad : colors.okay;
    ctx.fillRect(76, y + 16, 5, 80); font(ctx, 22, fonts.bold); ctx.fillText(ingredient.kind, 103, y + 29);
    ctx.fillStyle = colors.text; font(ctx, 38, fonts.semibold); wrapped(ctx, ingredient.name, 103, y + 68, 874, 37, 2);
  });
  if (!data.ingredients.length) {
    ctx.fillStyle = '#FFFFFF0B'; rect(ctx, 76, 650, 928, 230, 20); ctx.fill();
    ctx.fillStyle = tint; ctx.fillRect(76, 676, 5, 176);
    ctx.fillStyle = colors.text; font(ctx, 48, fonts.bold); wrapped(ctx, data.emptyMessage, 108, 741, 850, 60, 2);
  }
  if (data.moreCount) { ctx.fillStyle = colors.text; font(ctx, 30, fonts.semibold); ctx.fillText(`+${data.moreCount} more`, 76, 1179); }
  ctx.strokeStyle = colors.rule; ctx.beginPath(); ctx.moveTo(76, 1210); ctx.lineTo(1004, 1210); ctx.stroke();
  ctx.fillStyle = colors.inkMuted; font(ctx, 28); ctx.fillText(`Scanned ${data.scanDate}`, 76, 1257);
  ctx.fillStyle = colors.text; font(ctx, 36, fonts.bold); ctx.fillText(data.website, 76, 1310);
  ctx.fillStyle = colors.inkMuted; font(ctx, 23); ctx.textAlign = 'right';
  ctx.fillText('Not medical advice', 1004, 1257); ctx.fillText("Doesn't check allergens", 1004, 1308);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not create the PNG.')), 'image/png'));
  return new File([blob], `sugar-depth-${data.verdict.toLowerCase()}-${data.dateKey}.png`, { type: 'image/png' });
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled';
type ShareBrowser = {
  navigator?: {
    canShare?: (data: { files: File[] }) => boolean;
    share?: (data: { files: File[] }) => Promise<void>;
  };
  download: (file: File) => void;
};

function download(file: File) {
  if (typeof document === 'undefined') throw new Error('Image sharing is available in the web app.');
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = file.name; document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

/** File is prepared before the tap, so navigator.share runs inside user activation. */
export async function shareVerdictCard(file: File, browser: ShareBrowser = { navigator: globalThis.navigator, download }): Promise<ShareOutcome> {
  try {
    if (browser.navigator?.share && browser.navigator.canShare?.({ files: [file] })) {
      await browser.navigator.share({ files: [file] });
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    // A rejected/blocked share sheet still leaves an ordinary PNG download.
  }
  browser.download(file);
  return 'downloaded';
}
