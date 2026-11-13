import type { Ref } from 'react';

/** A rectangle in 0–1 units of an image's width and height. */
export type Rect = { x: number; y: number; width: number; height: number };

/** The guide box in view pixels, plus the size of the camera view it sits on. */
export type ViewBox = { x: number; y: number; width: number; height: number; viewWidth: number; viewHeight: number };

/** How a photo was taken (camera, stream size, torch…), sent with the scan for the server logs. */
export type CaptureMeta = Record<string, string | number | boolean>;

/**
 * A captured photo. `crop` is the guide box (with a margin) on the photo, when it is known.
 * `upload`, when set, is the ready-to-send base64 JPEG (the web camera encodes it at capture).
 */
export type Photo = { uri: string; width: number; height: number; crop?: Rect; upload?: string; meta?: CaptureMeta };

export type LabelCameraHandle = { capture: () => Promise<Photo> };

export type LabelCameraProps = {
  torch: boolean;
  box: ViewBox | null;
  /** False while a result covers the camera: the preview pauses (web) or closes (phones). */
  active: boolean;
  onReadyChange: (ready: boolean) => void;
  /** Whether the running camera can light its torch; re-reported for every new camera stream. */
  onTorchSupport: (supported: boolean) => void;
  /** The torch was asked for but didn't come on. */
  onTorchFailed: () => void;
  /** Web only. Native keeps the manual shutter. */
  autoCapture?: boolean;
  onAutoCapture?: () => void;
  ref?: Ref<LabelCameraHandle>;
};

/** Jev rejects any side over 1568 px or under 280 px. */
export const UPLOAD_MAX_SIDE = 1568;
export const UPLOAD_MIN_SIDE = 280;

/**
 * Which part of a `width`×`height` frame to upload and at what size: the guide box (with its margin)
 * when it is big enough, else the whole frame, shrunk so the longest side is at most 1568 px.
 */
export function uploadPlan(width: number, height: number, region: Rect | null) {
  const box = region && toPixels(withMargin(region, CROP_MARGIN), width, height);
  const src = box && Math.min(box.width, box.height) >= UPLOAD_MIN_SIDE ? box : { originX: 0, originY: 0, width, height };
  const scale = Math.min(1, UPLOAD_MAX_SIDE / Math.max(src.width, src.height));
  return { src, width: Math.round(src.width * scale), height: Math.round(src.height * scale), cropped: src === box };
}

/** JPEG quality of the phone's still. It is decoded once and re-encoded at upload size, so 0.9 bought nothing. */
export const CAPTURE_QUALITY = 0.8;

/** The still size we aim for: just enough that the guide-box crop still fills a 1568 px upload. */
export const TARGET_PICTURE_SIDE = 1920;

/**
 * Picks the smallest `pictureSize` (from `getAvailablePictureSizesAsync`, e.g. "1920x1080") whose crop to
 * the guide box (with its margin) still has a longest side of 1568 px and a shortest of 280 px, so the
 * phone decodes far fewer pixels than a 12–48 MP full-sensor still. Sizes under 1920 px are never picked.
 * Returns undefined (keep the full-resolution "Photo" default) when no WxH size is big enough.
 */
export function pickPictureSize(sizes: readonly string[], box: ViewBox | null): string | undefined {
  const portrait = !box || box.viewHeight >= box.viewWidth;
  const fits = (long: number, short: number) => {
    const [width, height] = portrait ? [short, long] : [long, short];
    if (!box) return long >= UPLOAD_MAX_SIDE;
    const rect = toPixels(withMargin(boxInImage(box, width, height), CROP_MARGIN), width, height);
    return Math.max(rect.width, rect.height) >= UPLOAD_MAX_SIDE && Math.min(rect.width, rect.height) >= UPLOAD_MIN_SIDE;
  };
  let best: { size: string; pixels: number } | undefined;
  for (const size of sizes) {
    const m = /^(\d+)x(\d+)$/.exec(size);
    if (!m) continue;
    const long = Math.max(+m[1], +m[2]);
    const short = Math.min(+m[1], +m[2]);
    if (long < TARGET_PICTURE_SIDE || !fits(long, short)) continue;
    if (!best || long * short < best.pixels) best = { size, pixels: long * short };
  }
  return best?.size;
}

/** Thrown by `capture()` when the photo is too soft to read; the next tap is accepted anyway. */
export class BlurryPhotoError extends Error {}

/** Kept around the guide box so a label that overhangs it still reaches the server. */
export const CROP_MARGIN = 0.12;

/** Where the guide box falls on a `width`×`height` image shown full-bleed ("cover") behind it. */
export function boxInImage(box: ViewBox, width: number, height: number): Rect {
  const scale = Math.max(box.viewWidth / width, box.viewHeight / height);
  const left = (width - box.viewWidth / scale) / 2;
  const top = (height - box.viewHeight / scale) / 2;
  return {
    x: (left + box.x / scale) / width,
    y: (top + box.y / scale) / height,
    width: box.width / scale / width,
    height: box.height / scale / height,
  };
}

/** Grows `r` by `margin` of its size on every side, clamped to the image. */
export function withMargin(r: Rect, margin: number): Rect {
  const x = Math.max(0, r.x - r.width * margin);
  const y = Math.max(0, r.y - r.height * margin);
  return {
    x,
    y,
    width: Math.min(1, r.x + r.width * (1 + margin)) - x,
    height: Math.min(1, r.y + r.height * (1 + margin)) - y,
  };
}

/** `r` in whole pixels of a `width`×`height` image, kept inside it. */
export function toPixels(r: Rect, width: number, height: number) {
  const originX = Math.max(0, Math.round(r.x * width));
  const originY = Math.max(0, Math.round(r.y * height));
  return {
    originX,
    originY,
    width: Math.min(width - originX, Math.round(r.width * width)),
    height: Math.min(height - originY, Math.round(r.height * height)),
  };
}
