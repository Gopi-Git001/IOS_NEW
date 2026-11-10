import { type CSSProperties, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { BlurryPhotoError, boxInImage, type CaptureMeta, type LabelCameraProps, type Rect, uploadPlan, type ViewBox } from '../lib/photo';
import { markScan, noteScan } from '../lib/scanTiming';
import { autoCaptureStep, initialAutoCapture, lockAutoCapture, laplacianVariance, MIN_SHARPNESS, SAMPLE_WIDTH, toGray } from '../lib/sharpness';

// Browsers stream 640×480 unless asked for more. 4:3 is the phone sensor's full frame, and 1920×1440
// is plenty for a 1568 px upload while staying light on iPhones.
const SIZE: MediaTrackConstraints = { width: { ideal: 1920 }, height: { ideal: 1440 } };
const BURST = 3;
const BURST_GAP_MS = 70;
const STILL_TIMEOUT_MS = 2500;
const JPEG_QUALITY = 0.85;
/** A result left open this long releases the camera; it restarts when the camera screen returns. */
const IDLE_STOP_MS = 60_000;
const SETTLE_POLL_MS = 200;
const SETTLE_LIMIT_MS = 5000;
const CENTER: Rect = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 };
const CAMERA_KEY = 'reallabel.camera';

type Caps = MediaTrackCapabilities & { focusMode?: string[]; torch?: boolean };
type ImageCaptureLike = {
  getPhotoCapabilities(): Promise<{ imageWidth?: { max?: number }; imageHeight?: { max?: number } }>;
  takePhoto(settings?: { imageWidth?: number; imageHeight?: number }): Promise<Blob>;
};
type ImageCaptureCtor = new (track: MediaStreamTrack) => ImageCaptureLike;
/** One captured moment: a full-size frame for the result screen and the cropped, scaled upload. */
type Frame = { display: HTMLCanvasElement; upload: HTMLCanvasElement; width: number; height: number; score: number; cropped: boolean };
type StreamStats = { label: string; openedAt: number; openMs?: number; settleMs?: number; torch?: Record<string, unknown> };

let lastUrl: string | null = null;
let sampler: HTMLCanvasElement | null = null;
// Keep the shot's scene even if the browser eventually releases and reopens the stream.
let autoState = initialAutoCapture();
let cameraStarts = 0;
const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
const queues = new WeakMap<MediaStreamTrack, Promise<unknown>>();

/**
 * The live back camera in the browser. Phones use LabelCamera.tsx.
 * The stream stays open under the result screen so "Scan another" is instant, and is released
 * after a minute there or whenever the page is hidden.
 */
export function LabelCamera({ torch, box, active, onReadyChange, onTorchSupport, onTorchFailed, autoCapture = false, onAutoCapture, ref }: LabelCameraProps) {
  const video = useRef<HTMLVideoElement>(null);
  const track = useRef<MediaStreamTrack | null>(null);
  const stats = useRef<StreamStats>({ label: '', openedAt: 0 });
  const torchSupported = useRef(false);
  const rejected = useRef(false);
  const callbacks = useRef({ onReadyChange, onTorchSupport, onTorchFailed });
  const [live, setLive] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [expired, setExpired] = useState(false);
  const canRearm = useRef(true);
  const autoCallback = useRef(onAutoCapture);
  autoCallback.current = onAutoCapture;

  // The camera stays mounted now: returning from the result, not remounting, permits re-arming.
  useEffect(() => {
    if (active) canRearm.current = true;
  }, [active]);

  useEffect(() => {
    callbacks.current = { onReadyChange, onTorchSupport, onTorchFailed };
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (active) return;
    const timer = setTimeout(() => setExpired(true), IDLE_STOP_MS);
    return () => {
      clearTimeout(timer);
      setExpired(false);
    };
  }, [active]);

  const run = foreground && (active || !expired);

  useEffect(() => {
    if (!run) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    const openedAt = performance.now();
    cameraStarts++;
    openCamera()
      .then((s) => {
        if (cancelled) return stopStream(s);
        stream = s;
        const t = s.getVideoTracks()[0] ?? null;
        track.current = t;
        stats.current = { label: t?.label ?? '', openedAt };
        console.info('[camera] started', { start: cameraStarts, camera: t?.label });
        if (video.current) {
          video.current.srcObject = s;
          video.current.play().catch(() => {});
        }
      })
      .catch((e) => console.warn('[camera] could not start', e));
    return () => {
      cancelled = true;
      stopStream(stream);
      track.current = null;
      torchSupported.current = false;
      if (video.current) video.current.srcObject = null;
      setLive(false);
      callbacks.current.onReadyChange(false);
      callbacks.current.onTorchSupport(false);
      if (stream) console.info('[camera] stopped');
    };
  }, [run]);

  // Under the result screen the preview just pauses; the camera keeps running for the next scan.
  useEffect(() => {
    const v = video.current;
    if (!v || !live) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active, live]);

  useEffect(() => {
    // The torch only rides along here; switching it must not refocus.
    if (live && track.current && video.current) focus(track.current, video.current, box, torch && torchSupported.current);
  }, [live, box]);

  useEffect(() => {
    const t = track.current;
    if (!live || !t || !torchSupported.current) return;
    if (!torch && !(t.getSettings() as { torch?: boolean }).torch) return;
    setTorch(t, torch).then((result) => {
      stats.current.torch = result;
      console.info('[camera] torch', result);
      if (torch && !result.ok && track.current === t) callbacks.current.onTorchFailed();
    });
  }, [live, torch]);

  const started = () => {
    const t = track.current;
    const v = video.current;
    if (!t || !v) return;
    const caps = (t.getCapabilities?.() ?? {}) as Caps;
    torchSupported.current = Boolean(caps.torch);
    stats.current.openMs = Math.round(performance.now() - stats.current.openedAt);
    console.info('[camera] ready', { camera: t.label, stream_px: `${v.videoWidth}x${v.videoHeight}`, torch_caps: Boolean(caps.torch) });
    setLive(true);
    callbacks.current.onReadyChange(true);
    callbacks.current.onTorchSupport(torchSupported.current);
    measureSettle(v, t, stats.current);
  };

  useEffect(() => {
    if (!live || !active || !foreground || !autoCapture || !box) return;
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
        // Sampling failure must not prevent a manual shot.
        autoState = { ...autoState, since: undefined, count: 0, lastAt: undefined };
      }
    }, 140);
    return () => {
      clearInterval(timer);
      autoState = { ...autoState, since: undefined, count: 0, lastAt: undefined };
    };
  }, [live, active, foreground, autoCapture, box]);

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
        // takePhoto can switch a lit torch off, and a lit label needs no sharpest-of-three: one frame.
        const torchOn = torch && torchSupported.current;
        const still = torchOn ? null : await takeStill(t, v, region);
        markScan('still_attempt_done');
        const shot = still ?? (await grabFrames(v, region, torchOn ? 1 : BURST));
        if (shot.score < MIN_SHARPNESS && !rejected.current) {
          rejected.current = true;
          throw new BlurryPhotoError('Photo is blurry');
        }
        rejected.current = false;

        const encodeStart = performance.now();
        const [upload, display] = await Promise.all([toJpeg(shot.upload), toJpeg(shot.display)]);
        const s = stats.current;
        const meta: CaptureMeta = {
          capture_path: still ? 'still' : torchOn ? 'frame' : 'burst',
          stream_px: `${v.videoWidth}x${v.videoHeight}`,
          camera: s.label.slice(0, 64),
          torch: torchOn,
          upload_px: `${shot.upload.width}x${shot.upload.height}`,
          upload_kb: Math.round(upload.size / 1024),
          upload_cropped: shot.cropped,
          display_kb: Math.round(display.size / 1024),
          encode_ms: Math.round(performance.now() - encodeStart),
          camera_starts: cameraStarts,
          stream_age_ms: Math.round(performance.now() - s.openedAt),
          ...(s.openMs !== undefined && { stream_open_ms: s.openMs }),
          ...(s.settleMs !== undefined && { stream_settle_ms: s.settleMs }),
          ...(s.torch && { torch_setting: String(s.torch.setting), torch_ok: Boolean(s.torch.ok) }),
        };
        noteScan(meta);
        if (lastUrl) URL.revokeObjectURL(lastUrl);
        lastUrl = URL.createObjectURL(display);
        return { uri: lastUrl, width: shot.width, height: shot.height, upload: await toBase64(upload), meta };
      },
    }),
    [box, torch],
  );

  return <video ref={video} autoPlay playsInline muted onLoadedMetadata={started} style={videoStyle} />;
}

/** The back camera; on Android, the one with a torch (remembered once found). */
async function openCamera(): Promise<MediaStream> {
  const saved = savedCamera();
  if (saved) {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: saved }, ...SIZE } });
    } catch {
      saveCamera(null);
    }
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, ...SIZE } });
  return isAndroid ? preferTorchCamera(stream) : stream;
}

/**
 * Android phones list several back cameras and Chrome often opens one without the flash unit.
 * Tries the others one at a time (phones can't open two at once) and keeps the first with a torch.
 */
async function preferTorchCamera(stream: MediaStream): Promise<MediaStream> {
  const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
  if (!current || hasTorch(stream)) {
    saveCamera(current ?? null);
    return stream;
  }
  const others = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput' && d.deviceId && d.deviceId !== current && isBackCamera(d));
  console.info('[camera] no torch on', stream.getVideoTracks()[0]?.label, '- trying', others.map((d) => d.label));
  if (others.length === 0) {
    saveCamera(current);
    return stream;
  }
  stopStream(stream);
  for (const device of others) {
    try {
      const candidate = await navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: device.deviceId }, ...SIZE } });
      if (hasTorch(candidate)) {
        saveCamera(device.deviceId);
        return candidate;
      }
      stopStream(candidate);
    } catch {}
  }
  saveCamera(current);
  return navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId: { exact: current }, ...SIZE } });
}

function hasTorch(stream: MediaStream) {
  const caps = (stream.getVideoTracks()[0]?.getCapabilities?.() ?? {}) as Caps;
  return Boolean(caps.torch);
}

function isBackCamera(device: MediaDeviceInfo) {
  const facing = (device as MediaDeviceInfo & { getCapabilities?: () => { facingMode?: string[] } }).getCapabilities?.().facingMode;
  return facing?.includes('environment') || /back|rear|environment/i.test(device.label);
}

function savedCamera(): string | null {
  try {
    return localStorage.getItem(CAMERA_KEY);
  } catch {
    return null;
  }
}

function saveCamera(deviceId: string | null) {
  try {
    if (deviceId) localStorage.setItem(CAMERA_KEY, deviceId);
    else localStorage.removeItem(CAMERA_KEY);
  } catch {}
}

/** Runs constraint changes on a track one after another, so focus and torch can't race. */
function enqueue<T>(t: MediaStreamTrack, change: () => Promise<T>): Promise<T> {
  const next = (queues.get(t) ?? Promise.resolve()).then(change, change);
  queues.set(t, next.catch(() => {}));
  return next;
}

/** Continuous focus aimed at the guide box, wherever the browser supports it. */
function focus(t: MediaStreamTrack, v: HTMLVideoElement, box: ViewBox | null, torchOn: boolean) {
  const caps = (t.getCapabilities?.() ?? {}) as Caps;
  const supported = navigator.mediaDevices.getSupportedConstraints() as Record<string, boolean | undefined>;
  const set: Record<string, unknown> = {};
  if (caps.focusMode?.includes('continuous')) set.focusMode = 'continuous';
  if (box && supported.pointsOfInterest) {
    const r = boxInImage(box, v.videoWidth, v.videoHeight);
    set.pointsOfInterest = [{ x: r.x + r.width / 2, y: r.y + r.height / 2 }];
  }
  if (Object.keys(set).length === 0) return;
  // applyConstraints replaces every constraint, so the size goes in again, and a lit torch rides along
  // in its own set so a focus setting the camera can't meet never turns it off.
  const advanced = [set, ...(torchOn ? [{ torch: true }] : [])] as MediaTrackConstraintSet[];
  enqueue(t, () => t.applyConstraints({ ...SIZE, advanced })).catch(() => {});
}

/** The torch on its own, then read back: the browser may accept the request and leave it dark. */
function setTorch(t: MediaStreamTrack, on: boolean) {
  return enqueue(t, async () => {
    try {
      await t.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] });
    } catch (e) {
      return { requested: on, ok: false, error: e instanceof Error ? e.name : String(e) };
    }
    const setting = (t.getSettings() as { torch?: boolean }).torch;
    return { requested: on, ok: setting === on, setting };
  });
}

/** How long a fresh stream takes to give a frame sharp enough to read (autofocus settling). */
function measureSettle(v: HTMLVideoElement, t: MediaStreamTrack, s: StreamStats) {
  const start = performance.now();
  const poll = () => {
    if (t.readyState !== 'live' || !v.videoWidth) return;
    const elapsed = performance.now() - start;
    if (sharpness(v, v.videoWidth, v.videoHeight, null) >= MIN_SHARPNESS) {
      s.settleMs = Math.round(elapsed);
      console.info('[camera] settled', { ms: s.settleMs });
    } else if (elapsed < SETTLE_LIMIT_MS) setTimeout(poll, SETTLE_POLL_MS);
  };
  setTimeout(poll, SETTLE_POLL_MS);
}

/** A real still photo (Chrome on Android and desktop). Null when unsupported, slow, or rotated differently from the preview. */
async function takeStill(t: MediaStreamTrack, v: HTMLVideoElement, region: Rect | null): Promise<Frame | null> {
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
    const frame = newFrame(width, height, crop);
    paint(frame, bitmap, crop);
    frame.score = sharpness(bitmap, width, height, crop);
    bitmap.close();
    return frame;
  } catch {
    return null;
  }
}

/** `count` preview frames in quick succession; keeps the sharpest. */
async function grabFrames(v: HTMLVideoElement, region: Rect | null, count: number): Promise<Frame> {
  const frame = newFrame(v.videoWidth, v.videoHeight, region);
  for (let i = 0; i < count; i++) {
    if (i > 0) await wait(BURST_GAP_MS);
    const score = sharpness(v, frame.width, frame.height, region);
    if (score > frame.score) {
      frame.score = score;
      paint(frame, v, region);
    }
  }
  return frame;
}

function newFrame(width: number, height: number, region: Rect | null): Frame {
  const plan = uploadPlan(width, height, region);
  return { display: canvas(width, height), upload: canvas(plan.width, plan.height), width, height, score: -1, cropped: plan.cropped };
}

/** Draws one moment into both canvases: the whole frame, and straight from the source the guide box at upload size. */
function paint(frame: Frame, source: CanvasImageSource, region: Rect | null) {
  const { src } = uploadPlan(frame.width, frame.height, region);
  context(frame.display).drawImage(source, 0, 0, frame.width, frame.height);
  context(frame.upload).drawImage(source, src.originX, src.originY, src.width, src.height, 0, 0, frame.upload.width, frame.upload.height);
}

function canvas(width: number, height: number) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

function context(c: HTMLCanvasElement) {
  const ctx = c.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas unavailable');
  return ctx;
}

function toJpeg(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))), 'image/jpeg', JPEG_QUALITY),
  );
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).slice(String(reader.result).indexOf(',') + 1));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the photo'));
    reader.readAsDataURL(blob);
  });
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
