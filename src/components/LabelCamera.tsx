import { CameraView } from 'expo-camera';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { boxInImage, CROP_MARGIN, type LabelCameraProps, withMargin } from '../lib/photo';

/**
 * The live back camera on phones: expo-camera takes a full-resolution still. The web build uses LabelCamera.web.tsx.
 * It closes while a result covers it and reopens for the next scan.
 */
export function LabelCamera({ torch, box, active, onReadyChange, onTorchSupport, ref }: LabelCameraProps) {
  const camera = useRef<CameraView>(null);

  useEffect(() => {
    if (!active) onReadyChange(false);
  }, [active, onReadyChange]);

  useImperativeHandle(
    ref,
    () => ({
      async capture() {
        if (!camera.current) throw new Error('Camera not ready');
        const { uri, width, height } = await camera.current.takePictureAsync({ quality: 0.9 });
        return { uri, width, height, crop: box ? withMargin(boxInImage(box, width, height), CROP_MARGIN) : undefined };
      },
    }),
    [box],
  );

  if (!active) return null;
  return (
    <CameraView
      ref={camera}
      style={StyleSheet.absoluteFill}
      facing="back"
      enableTorch={torch}
      onCameraReady={() => {
        onReadyChange(true);
        onTorchSupport(true);
      }}
    />
  );
}
