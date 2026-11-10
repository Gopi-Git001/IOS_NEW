import { Image } from 'react-native';
import type { Photo } from './photo';

// Test-only stand-in for the camera, for the Maestro flows in .maestro/: the shutter "takes" a fixed
// label photo (assets/test/label.jpg, Honey Nut Cheerios from Open Food Facts, CC BY-SA 3.0).
// On only in a development bundle started with EXPO_PUBLIC_TEST_PHOTO=1. The check is written inline,
// NODE_ENV first, so production bundles fold it to false and never include the photo; that is also
// why the require sits here instead of a top-level import.
const asset: number | null =
  process.env.NODE_ENV !== 'production' && process.env.EXPO_PUBLIC_TEST_PHOTO === '1' ? require('../../assets/test/label.jpg') : null;

export const testPhotoEnabled = asset !== null;

/** The fixed test photo, or null when the test source is off (always, in production). */
export function testPhoto(): Photo | null {
  const source = asset === null ? undefined : Image.resolveAssetSource(asset);
  if (!source) return null;
  // 0 makes the upload step measure the image itself (src/lib/api.ts).
  return { uri: source.uri, width: source.width ?? 0, height: source.height ?? 0, meta: { source: 'test-photo' } };
}
