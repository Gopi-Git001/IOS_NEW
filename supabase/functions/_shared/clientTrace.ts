// Explicit allowlist: never log arbitrary client fields, account data or model output.
const marks = ['tap', 'still_attempt_done', 'captured', 'prepared', 'upload_start', 'quick_verdict_response', 'scan_label_response', 'verdict_on_screen', 'lists_on_screen', 'error_on_screen'];
export function clientTrace(value: unknown): Record<string, unknown> {
  const input = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const out: Record<string, unknown> = {};
  for (const key of [...marks, 'image_kb']) {
    const n = input[key];
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 3_600_000) out[key] = Math.round(n);
  }
  for (const key of ['photo_px', 'stream_px', 'upload_px']) {
    if (typeof input[key] === 'string' && /^\d{1,5}x\d{1,5}$/.test(input[key])) out[key] = input[key];
  }
  const enums: Record<string, string[]> = {
    platform: ['web', 'ios', 'android'],
    capture_path: ['still', 'burst', 'native'],
    network: ['bluetooth', 'cellular', 'ethernet', 'wifi', 'wimax', 'other', 'unknown', 'slow-2g', '2g', '3g', '4g'],
  };
  for (const [key, allowed] of Object.entries(enums)) if (allowed.includes(input[key] as string)) out[key] = input[key];
  return out;
}
