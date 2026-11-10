// Jev rejects an image with either side under 280 px (HTTP 400). A very wide or very tall label photo
// can end up that thin after the app shrinks its long side to 1568 px, so pad it, never stretch it,
// before it goes to Jev. Pure: runs under Deno (quick-verdict) and Node (tests).
import { Buffer } from 'node:buffer';
import jpeg from 'jpeg-js';

export const JEV_MIN_SIDE = 280;
const PAD_QUALITY = 90;

/** Width and height from a JPEG's start-of-frame marker, without decoding it. Null if it isn't a JPEG. */
export function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0-SOF15, except DHT (C4), JPG (C8) and DAC (CC).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + length;
  }
  return null;
}

/** The canvas a `width`×`height` image needs so both sides reach 280 px, with the image centred on it. */
export function padPlan(width: number, height: number) {
  const w = Math.max(width, JEV_MIN_SIDE);
  const h = Math.max(height, JEV_MIN_SIDE);
  return { width: w, height: h, left: Math.floor((w - width) / 2), top: Math.floor((h - height) / 2), needed: w !== width || h !== height };
}

export type Padded = { image: string; padded: false } | { image: string; padded: true; from: string; to: string };

/** Returns the base64 JPEG unchanged when both sides are 280 px or more, else centred on a white canvas that is. */
export function padForJev(imageBase64: string): Padded {
  const bytes = Buffer.from(imageBase64, 'base64');
  const size = jpegSize(bytes);
  if (!size) return { image: imageBase64, padded: false };
  const plan = padPlan(size.width, size.height);
  if (!plan.needed) return { image: imageBase64, padded: false };

  const src = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const out = new Uint8Array(plan.width * plan.height * 4).fill(255);
  for (let y = 0; y < src.height; y++) {
    const from = y * src.width * 4;
    out.set(src.data.subarray(from, from + src.width * 4), ((y + plan.top) * plan.width + plan.left) * 4);
  }
  const encoded = jpeg.encode({ data: out, width: plan.width, height: plan.height }, PAD_QUALITY);
  return {
    image: Buffer.from(encoded.data).toString('base64'),
    padded: true,
    from: `${src.width}x${src.height}`,
    to: `${plan.width}x${plan.height}`,
  };
}
