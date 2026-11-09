import { type CSSProperties, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { BlurryPhotoError, boxInImage, CROP_MARGIN, type LabelCameraProps, type Rect, type ViewBox, withMargin } from '../lib/photo';
import { markScan, noteScan } from '../lib/scanTiming';
import { autoCaptureStep, initialAutoCapture, lockAutoCapture, laplacianVariance, MIN_SHARPNESS, SAMPLE_WIDTH, toGray } from '../lib/sharpness';

// Browsers stream 640×480 unless asked for more. 4:3 is the phone sensor's full frame.
const SIZE: MediaTrackConstraints = { width: { ideal: 4032 }, height: { ideal: 3024 } };
const BURST = 3;
const BURST_GAP_MS = 70;
const STILL_TIMEOUT_MS = 2500;
const JPEG_QUALITY = 0.92;
const CENTER: Rect = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };

type Caps = MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
type Shot = { blob: Blob; width: number; height: number; score: number; crop: Rect | null };
type ImageCaptureLike = {
  getPhotoCapabilities(): Promise<{ imageWidth?: { max?: number }; imageHeight?: { max?: number } }>;
  takePhoto(settings?: { imageWidth?: number; imageHeight?: number }): Promise<Blob>;
};
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;

let lastUrl: string | null = null;
let sampler: HTMLCanvasElement | null = null;
// Survives the result screen unmount. Never auto-scan the same stationary label twice.
let autoState = initialAutoCapture();

/** The live back camera in the browser, at the highest resolution it offers. Phones use LabelCamera.tsx. */
export function LabelCamera({ torch, box, onReady, autoCapture = false, onAutoCapture, ref }: LabelCameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<MediaStreamTrack | null>(null);
  const rejected = useRef(false);
  const readyCallback = useRef(onReady);
  const [live, setLive] = useState(false);
  const canRearm = useRef(true);
  const autoCallback = useRef(onAutoCapture);
  autoCallback.current = onAutoCapture;

  useEffect(() => {
    readyCallback.current = onReady;
  });

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...SIZE } })
      .then((s) => {
        if (cancelled) return stopStream(s);
        stream = s;
        track.current = s.getVideoTracks()[0] ?? null;
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stopStream(stream);
      track.current = null;
    };
  }, []);

  useEffect(() => {
    if (live && track.current && video.current) tune(track.current, video.current, torch, box);
  }, [live, torch, box]);

  useEffect(() => {
    if (!live || !autoCapture || !box) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const timer = setInterval(() => {
      const v = video.current;
      if (document.hidden || !v?.videoWidth || v.paused || v.readyState < 2) {
        autoState = { ...autoState, since: undefined, count: 0, lastAt: undefined };
        return;
      }
      try {
        const r = boxInImage(box, v.videoWidth, v.videoHeight);
        canvas.width = 240;
        canvas.height = Math.max(3, Math.round(240 * r.height * v.videoHeight / (r.width * v.videoWidth)));
        ctx.drawImage(v, r.x * v.videoWidth, r.y * v.videoHeight, r.width * v.videoWidth, r.height * v.videoHeight, 0, 0, canvas.width, canvas.height);
        const gray = toGray(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        const decision = autoCaptureStep(autoState, {
          gray, sharpness: laplacianVariance(gray, canvas.width, canvas.height),
          at: performance.now(), canRearm: canRearm.current,
        });
        autoState = decision.state;
        if (decision.fire) {
          canRearm.current = false;
          autoCallback.current?.();
        }
      } catch {
        // Unsupported sampling must not prevent manual capture.
        autoState = { ...autoState, since: undefined, count: 0, lastAt: undefined };
      }
    }, 140);
    return () => {
      clearInterval(timer);
      autoState = { ...autoState, since: undefined, count: 0, lastAt: undefined };
    };
  }, [live, autoCapture, box]);

  useImperativeHandle(
    ref,
    () => ({
      async capture() {
        canRearm.current = false;
        autoState = lockAutoCapture(autoState);
        const v = video.current;
        const t = track.current;
        if (!v || !t || !v.videoWidth) throw new Error('Camera not ready');
        const region = box ? boxInImage(box, v.videoWidth, v.videoHeight) : null;
        const still = await takeStill(t, v, region);
        markScan('still_attempt_done');
        const shot = still ?? (await bestFrame(v, region));
        noteScan({ capture_path: still ? 'still' : 'burst', stream_px: `${v.videoWidth}x${v.videoHeight}` });
        if (shot.score < MIN_SHARPNESS && !rejected.current) {
          rejected.current = true;
          throw new BlurryPhotoError('Photo is blurry');
        }
        rejected.current = false;
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(shot.blob);
        return { uri: lastUrl, width: shot.width, height: shot.height, crop: shot.crop ? withMargin(shot.crop, CROP_MARGIN) : undefined };
      },
    }),
    [box],
  );

  return (
    <video
      ref={video}
      autoPlay
      playsInline
      muted
      onLoadedMetadata={() => {
        setLive(true);
        readyCallback.current();
      }}
      style={videoStyle}
    />
  );
}

/** Continuous focus aimed at the guide box, plus the torch, wherever the browser supports them. */
function tune(t: MediaStreamTrack, v: HTMLVideoElement, torch: boolean, box: ViewBox | null) {
  const caps = (t.getCapabilities?.() ?? {}) as Caps;
  const supported = navigator.mediaDevices.getSupportedConstraints() as Record<string, boolean | undefined>;
  const set: Record<string, unknown> = {};
  if (caps.focusMode?.includes('continuous')) set.focusMode = 'continuous';
  if (box && supported.pointsOfInterest) {
    const r = boxInImage(box, v.videoWidth, v.videoHeight);
    set.pointsOfInterest = [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }];
  }
  if (caps.torch) set.torch = torch;
  if (Object.keys(set).length === 0) return;
  // applyConstraints replaces every constraint, so the size request goes in again.
  t.applyConstraints({ ...SIZE, advanced: [set as MediaTrackConstraintSet] }).catch(() => {});
}

/** A real still photo (Chrome on Android and desktop). Null when unsupported, slow, or rotated differently from the preview. */
async function takeStill(t: MediaStreamTrack, v: HTMLVideoElement, region: Rect | null): Promise<Shot | null> {
  const ImageCapture = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
  if (!ImageCapture) return null;
  try {
    const capture = new ImageCapture(t);
    const caps = await capture.getPhotoCapabilities();
    const blob = await withTimeout(capture.takePhoto({ imageWidth: caps.imageWidth?.max, imageHeight: caps.imageHeight?.max }), STILL_TIMEOUT_MS);
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    if (width > height !== v.videoWidth > v.videoHeight) {
      bitmap.close();
      return null;
    }
    // A still with a different shape from the preview frames a different area, so the box can't be mapped onto it.
    const crop = region && Math.abs(width / height - v.videoWidth / v.videoHeight) < 0.02 ? region : null;
    const score = sharpness(bitmap, width, height, crop);
    bitmap.close();
    return { blob, width, height, score, crop };
  } catch {
    return null;
  }
}

/** A few preview frames in quick succession; keeps the sharpest. */
async function bestFrame(v: HTMLVideoElement, region: Rect | null): Promise<Shot> {
  const width = v.videoWidth;
  const height = v.videoHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas unavailable');
  let best = -1;
  for (let i = 0; i < BURST; i++) {
    if (i > 0) await wait(BURST_GAP_MS);
    const score = sharpness(v, width, height, region);
    if (score > best) {
      best = score;
      ctx.drawImage(v, 0, 0, width, height);
    }
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('Could not encode the photo');
  return { blob, width, height, score: best, crop: region };
}

/** Sharpness of the guide box (or the middle of the frame) in `source`. */
function sharpness(source: CanvasImageSource, width: number, height: number, region: Rect | null): number {
  const r = region ?? CENTER;
  const sw = r.width * width;
  const sh = r.height * height;
  const w = Math.max(3, Math.min(SAMPLE_WIDTH, Math.round(sw)));
  const h = Math.max(3, Math.round((w * sh) / sw));
  sampler ??= document.createElement('canvas');
  sampler.width = w;
  sampler.height = h;
  const ctx = sampler.getContext('2d', { willReadFrequently: true });
  if (!ctx) return Infinity;
  ctx.drawImage(source, r.x * width, r.y * height, sw, sh, 0, 0, w, h);
  return laplacianVariance(toGray(ctx.getImageData(0, 0, w, h).data, w, h), w, h);
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

const videoStyle: CSSProperties = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' };
