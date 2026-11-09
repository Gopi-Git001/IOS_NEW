/** Width the guide box is scaled to before scoring, so scores compare across cameras. */
export const SAMPLE_WIDTH = 400;

/** Below this score the text is too soft to read. In-focus print scores in the hundreds. */
export const MIN_SHARPNESS = 20;

export type AutoCaptureState = {
  locked: boolean;
  previous?: Uint8ClampedArray;
  reference?: Uint8ClampedArray;
  since?: number;
  lastAt?: number;
  count: number;
  moved: number;
};
export const initialAutoCapture = (): AutoCaptureState => ({ locked: false, count: 0, moved: 0 });

/** Mean luma difference; absolute brightness changes intentionally count as movement too. */
export function frameChange(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (!a.length || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

export function lockAutoCapture(state: AutoCaptureState): AutoCaptureState {
  return { locked: true, reference: state.previous, count: 0, moved: 0 };
}

/** Pure gate: 5 sharp, stable frames spanning >=560ms; no catch-up after background gaps. */
export function autoCaptureStep(
  state: AutoCaptureState,
  sample: { gray: Uint8ClampedArray; sharpness: number; at: number; canRearm: boolean },
): { state: AutoCaptureState; fire: boolean } {
  const { gray, sharpness, at, canRearm } = sample;
  const next = { ...state, previous: gray, lastAt: at };
  if (state.locked) {
    next.reference ??= gray;
    next.moved = canRearm && frameChange(next.reference, gray) > 18 ? state.moved + 1 : 0;
    if (next.moved >= 2) return { state: { ...initialAutoCapture(), previous: gray, lastAt: at }, fire: false };
    return { state: next, fire: false };
  }
  const steady = state.previous && frameChange(state.previous, gray) <= 3;
  const continuous = state.lastAt !== undefined && at - state.lastAt > 0 && at - state.lastAt <= 250;
  if (!Number.isFinite(sharpness) || sharpness < MIN_SHARPNESS * 4 || !steady || !continuous) {
    return { state: { ...next, since: undefined, count: 0 }, fire: false };
  }
  next.since ??= at;
  next.count++;
  if (next.count >= 5 && at - next.since >= 560) return { state: lockAutoCapture(next), fire: true };
  return { state: next, fire: false };
}

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
