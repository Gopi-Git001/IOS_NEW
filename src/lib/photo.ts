import type { Ref } from 'react';

/** A rectangle in 0–1 units of an image's width and height. */
export type Rect = { x: number; y: number; width: number; height: number };

/** The guide box in view pixels, plus the size of the camera view it sits on. */
export type ViewBox = { x: number; y: number; width: number; height: number; viewWidth: number; viewHeight: number };

/** A captured photo. `crop` is the guide box (with a margin) on the photo, when it is known. */
export type Photo = { uri: string; width: number; height: number; crop?: Rect };

export type LabelCameraHandle = { capture: () => Promise<Photo> };

export type LabelCameraProps = {
  torch: boolean;
  box: ViewBox | null;
  onReady: () => void;
  ref?: Ref<LabelCameraHandle>;
};

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
