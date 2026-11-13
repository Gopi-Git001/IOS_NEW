import { CameraView } from 'expo-camera';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { preparePhoto } from '../lib/api';
import { boxInImage, CAPTURE_QUALITY, CROP_MARGIN, type LabelCameraProps, pickPictureSize, withMargin } from '../lib/photo';
import { markScan, noteScan } from '../lib/scanTiming';
import { isConfigured } from '../lib/supabase';

/** The phone's picture sizes, read once: the camera closes under every result and reopens with the same list. */
let knownSizes: string[] | null = null;

/**
 * The live back camera on phones: expo-camera takes a still near 1920 px (sized so the guide-box crop still
 * fills a 1568 px upload) instead of a 12–48 MP full-sensor one. The web build uses LabelCamera.web.tsx.
 * It closes while a result covers it and reopens for the next scan.
 */
export function LabelCamera({ torch, box, active, onReadyChange, onTorchSupport, ref }: LabelCameraProps) {
  const camera = useRef<CameraView>(null);
  const [sizes, setSizes] = useState(knownSizes);
  const pictureSize = sizes ? pickPictureSize(sizes, box) : undefined;

  useEffect(() => {
    if (!active) onReadyChange(false);
  }, [active, onReadyChange]);

  useImperativeHandle(
    ref,
    () => ({
      async capture() {
        if (!camera.current) throw new Error('Camera not ready');
        const { uri, width, height } = await camera.current.takePictureAsync({ quality: CAPTURE_QUALITY, shutterSound: false });
        markScan('shutter_done');
        noteScan({ picture_size: pictureSize ?? 'default', capture_quality: CAPTURE_QUALITY });
        const photo = { uri, width, height, crop: box ? withMargin(boxInImage(box, width, height), CROP_MARGIN) : undefined };
        // Demo mode never uploads, so time the crop + resize + encode here in the background (dev only).
        if (__DEV__ && !isConfigured) void timePreparation(photo);
        return photo;
      },
    }),
    [box, pictureSize],
  );

  if (!active) return null;
  return (
    <CameraView
      ref={camera}
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      pictureSize={pictureSize}
      onCameraReady={() => {
        onReadyChange(true);
        onTorchSupport(true);
        if (!knownSizes) {
          camera.current
            ?.getAvailablePictureSizesAsync()
            .then((list) => {
              knownSizes = list;
              setSizes(list);
            })
            .catch(() => {});
        }
      }}
    />
  );
}

async function timePreparation(photo: Parameters<typeof preparePhoto>[0]) {
  try {
    const image = await preparePhoto(photo);
    markScan('prepared');
    noteScan({ image_kb: Math.round((image.length * 3) / 4 / 1024), prepared_in: 'demo' });
  } catch {}
}
