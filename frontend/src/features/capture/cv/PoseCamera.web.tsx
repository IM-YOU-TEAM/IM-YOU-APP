import { createElement, useEffect, useRef, useState } from 'react';
import { CameraStage, PoseOverlay } from './PoseOverlay';
import type { CameraGate, PoseCameraProps, PoseFrame, Vec3 } from './poseTypes';

const VISION_BUNDLE = '/mediapipe/vision_bundle.mjs';
const WASM_ROOT = '/mediapipe/wasm';
const MODEL_URL = '/models/pose_landmarker_lite.task';

type Landmark = { x: number; y: number; z: number; visibility?: number };
type PoseLandmarkerResult = { landmarks?: Landmark[][]; worldLandmarks?: Landmark[][] };
type Landmarker = {
  detectForVideo: (video: HTMLVideoElement, timestampMs: number) => PoseLandmarkerResult;
  close: () => void;
};
type VisionModule = {
  FilesetResolver: { forVisionTasks: (wasmRoot: string) => Promise<unknown> };
  PoseLandmarker: {
    createFromOptions: (fileset: unknown, options: Record<string, unknown>) => Promise<Landmarker>;
  };
};

/** Browser camera. The pose model runs in the page; frames are not uploaded. */
export function PoseCamera({ paused, caption, countLabel, onFrame, onGate }: PoseCameraProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onFrameRef = useRef(onFrame);
  const onGateRef = useRef(onGate);
  const pausedRef = useRef(paused);
  onFrameRef.current = onFrame;
  onGateRef.current = onGate;
  pausedRef.current = paused;

  const [gate, setGate] = useState<CameraGate>('starting');
  const [points, setPoints] = useState<Vec3[] | null>(null);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const reported = useRef<CameraGate>('starting');

  const report = (next: CameraGate) => {
    if (reported.current === next) return;
    reported.current = next;
    setGate(next);
    onGateRef.current(next);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      report('unavailable');
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    let landmarker: Landmarker | null = null;
    let raf = 0;
    let lastDetect = 0;
    let lastTs = 0;

    const fail = (next: CameraGate) => {
      if (cancelled) return;
      stopStream(stream);
      stream = null;
      report(next);
    };

    const loop = () => {
      if (cancelled || !landmarker) return;
      const now = performance.now();
      if (video.readyState >= 2 && now - lastDetect >= 66) {
        lastDetect = now;
        const ts = now <= lastTs ? lastTs + 1 : now;
        lastTs = ts;
        try {
          const frame = toFrame(landmarker.detectForVideo(video, ts), ts);
          if (video.videoWidth > 0) {
            setFrameSize((prev) => (prev.w === video.videoWidth && prev.h === video.videoHeight ? prev : { w: video.videoWidth, h: video.videoHeight }));
          }
          setPoints(frame?.image ?? null);
          if (!pausedRef.current) onFrameRef.current(frame);
        } catch {
          fail('model-error');
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail('unavailable');
        return;
      }
      try {
        stream = await openCamera();
      } catch (error) {
        fail(isDenied(error) ? 'denied' : 'unavailable');
        return;
      }
      if (cancelled) {
        stopStream(stream);
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        fail('unavailable');
        return;
      }
      try {
        landmarker = await createLandmarker();
      } catch {
        fail('model-error');
        return;
      }
      if (cancelled) {
        landmarker.close();
        landmarker = null;
        return;
      }
      report('ready');
      raf = requestAnimationFrame(loop);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      landmarker?.close();
      stopStream(stream);
      video.srcObject = null;
    };
  }, []);

  if (gate === 'denied') {
    return (
      <CameraStage
        title="The camera is off"
        detail="Allow camera access to measure your movement. Nothing is recorded until you do."
      />
    );
  }
  if (gate === 'unavailable') {
    return <CameraStage title="No camera available" detail="This browser could not open a camera. Nothing was scored." />;
  }
  if (gate === 'model-error') {
    return (
      <CameraStage
        title="The pose model didn't load"
        detail="Reload the page. The model is part of the app, and nothing was scored."
      />
    );
  }

  const live = gate === 'ready';
  return (
    <CameraStage caption={live ? caption : 'Opening the camera…'} countLabel={live ? countLabel : undefined}>
      {createElement('video', {
        ref: videoRef,
        autoPlay: true,
        playsInline: true,
        muted: true,
        style: {
          position: 'absolute' as const,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain' as const,
          backgroundColor: 'transparent',
        },
      })}
      <PoseOverlay points={points} frameWidth={frameSize.w} frameHeight={frameSize.h} />
    </CameraStage>
  );
}

function toFrame(result: PoseLandmarkerResult, tMs: number): PoseFrame | null {
  const image = result.landmarks?.[0];
  const world = result.worldLandmarks?.[0];
  if (!image || image.length < 33 || !world || world.length < 33) return null;
  return {
    tMs,
    image: image.slice(0, 33).map((point) => ({ x: point.x, y: point.y, z: point.z, visibility: point.visibility ?? 0 })),
    world: world.slice(0, 33).map((point, index) => ({
      x: point.x,
      y: point.y,
      z: point.z,
      visibility: image[index]?.visibility ?? point.visibility ?? 0,
    })),
  };
}

async function createLandmarker(): Promise<Landmarker> {
  // The MediaPipe bundle contains a dynamic import Metro refuses to compile.
  // It is copied into public/ and loaded by the browser, so the bundler never parses it.
  const load = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<VisionModule>;
  const { FilesetResolver, PoseLandmarker } = await load(VISION_BUNDLE);
  const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
  });
  try {
    return await PoseLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return PoseLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

async function openCamera(): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } } },
    { audio: false, video: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      if (isDenied(error)) throw error;
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error('Camera unavailable');
}

function isDenied(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.name === 'SecurityError');
}

function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}
