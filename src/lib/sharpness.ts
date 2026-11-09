/** Width the guide box is scaled to before scoring, so scores compare across cameras. */
export const SAMPLE_WIDTH = 400;

/** Below this score the text is too soft to read. In-focus print scores in the hundreds. */
export const MIN_SHARPNESS = 20;

/** Luma of an RGBA pixel buffer. */
export function toGray(rgba: ArrayLike<number>, width: number, height: number): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
  }
  return gray;
}

/** Variance of the 4-neighbour Laplacian of a grayscale image: low means blurry. */
export function laplacianVariance(gray: ArrayLike<number>, width: number, height: number): number {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v = 4 * gray[i] - gray[i - 1] - gray[i + 1] - gray[i - width] - gray[i + width];
      sum += v;
      sumSq += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}
