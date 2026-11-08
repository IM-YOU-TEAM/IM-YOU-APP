import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseDetectionResultBundle, ViewCoordinator } from 'react-native-mediapipe-posedetection';
import { CameraStage, PoseOverlay } from './PoseOverlay';
import type { CameraGate, PoseCameraProps, Vec3 } from './poseTypes';

type PoseModule = typeof import('react-native-mediapipe-posedetection');
type VisionModule = typeof import('react-native-vision-camera');

declare function require(moduleId: string): unknown;

/**
 * Vision Camera 4 is pinned in package.json. Expo SDK 58 resolves v5, and v5 removed the
 * frame-processor plugin API this pose package calls (`VisionCameraProxy`).
 * Both native packages throw while they evaluate in Expo Go. require() keeps that off the
 * setup screen, which only needs the demonstration video.
 */
function loadNative(): { module: PoseModule | null; vision: VisionModule | null } {
  try {
    const vision = require('react-native-vision-camera') as VisionModule;
    const module = require('react-native-mediapipe-posedetection') as PoseModule;
    return { module, vision };
  } catch {
    return { module: null, vision: null };
  }
}

const loaded = loadNative();

/** Phone camera. Pose runs on the device; frames are not uploaded. Needs a development build, not Expo Go. */
export function PoseCamera(props: PoseCameraProps) {
  if (!loaded.module || !loaded.vision) {
    return (
      <BlockedPose
        title="Pose tracking isn't in this install"
        detail="Open a development build from npx expo run:ios or npx expo run:android. Expo Go can't run the pose camera."
        gate="unavailable"
        onGate={props.onGate}
      />
    );
  }
  return <RunningPoseCamera api={loaded.module} vision={loaded.vision} {...props} />;
}

function BlockedPose({ title, detail, gate, onGate }: { title: string; detail: string; gate: CameraGate; onGate: (gate: CameraGate) => void }) {
  useEffect(() => {
    onGate(gate);
  }, [gate, onGate]);
  return <CameraStage title={title} detail={detail} />;
}

function RunningPoseCamera({
  api,
  vision,
  paused,
  caption,
  countLabel,
  onFrame,
  onGate,
}: { api: PoseModule; vision: VisionModule } & PoseCameraProps) {
  const onFrameRef = useRef(onFrame);
  const onGateRef = useRef(onGate);
  const pausedRef = useRef(paused);
  onFrameRef.current = onFrame;
  onGateRef.current = onGate;
  pausedRef.current = paused;

  const viewSize = useRef({ width: 1, height: 1 });
  const modelReady = useRef(false);
  const [points, setPoints] = useState<Vec3[] | null>(null);
  const [permission, setPermission] = useState<'starting' | 'granted' | 'denied'>('starting');
  const [modelError, setModelError] = useState(false);
  const [deviceWaited, setDeviceWaited] = useState(false);

  const onResults = useCallback((bundle: PoseDetectionResultBundle, vc: ViewCoordinator) => {
    modelReady.current = true;
    const result = bundle.results[0];
    const raw = result?.landmarks[0];
    const world = result?.worldLandmarks[0];
    if (!raw || raw.length < 33 || !world || world.length < 33) {
      setPoints(null);
      if (!pausedRef.current) onFrameRef.current(null);
      return;
    }
    const frameDims = vc.getFrameDims(bundle);
    const view = viewSize.current;
    const overlay = raw.slice(0, 33).map((point) => {
      const placed = vc.convertPoint(frameDims, { x: point.x, y: point.y });
      return {
        x: view.width > 0 ? placed.x / view.width : point.x,
        y: view.height > 0 ? placed.y / view.height : point.y,
        z: point.z,
        visibility: point.visibility ?? 0,
      };
    });
    setPoints(overlay);
    if (pausedRef.current) return;
    onFrameRef.current({
      tMs: performance.now(),
      image: raw.slice(0, 33).map((point) => ({ x: point.x, y: point.y, z: point.z, visibility: point.visibility ?? 0 })),
      world: world.slice(0, 33).map((point, index) => ({
        x: point.x,
        y: point.y,
        z: point.z,
        visibility: raw[index]?.visibility ?? point.visibility ?? 0,
      })),
    });
  }, []);

  const onError = useCallback(() => {
    if (!modelReady.current) setModelError(true);
  }, []);

  const detection = api.usePoseDetection(
    { onResults, onError },
    api.RunningMode.LIVE_STREAM,
    'pose_landmarker_lite.task',
    {
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      delegate: api.Delegate.CPU,
      mirrorMode: 'no-mirror',
      fpsMode: 15,
    },
  );

  const device = vision.useCameraDevice('back');

  useEffect(() => {
    let cancel = false;
    (async () => {
      let status = vision.Camera.getCameraPermissionStatus();
      if (status === 'not-determined') status = await vision.Camera.requestCameraPermission();
      if (!cancel) setPermission(status === 'granted' ? 'granted' : 'denied');
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    detection.cameraDeviceChangeHandler(device);
  }, [detection, device]);

  useEffect(() => {
    detection.resizeModeChangeHandler('contain');
  }, [detection]);

  useEffect(() => {
    if (permission !== 'granted' || device) return;
    const id = setTimeout(() => setDeviceWaited(true), 1500);
    return () => clearTimeout(id);
  }, [permission, device]);

  useEffect(() => {
    if (modelError) onGateRef.current('model-error');
    else if (permission === 'denied') onGateRef.current('denied');
    else if (permission === 'granted' && device) onGateRef.current('ready');
    else if (permission === 'granted' && deviceWaited) onGateRef.current('unavailable');
    else onGateRef.current('starting');
  }, [modelError, permission, device, deviceWaited]);

  if (modelError) {
    return (
      <CameraStage title="The pose model didn't load" detail="Rebuild the development app. The model is included with it, and nothing was scored." />
    );
  }
  if (permission === 'denied') {
    return (
      <CameraStage title="The camera is off" detail="Allow camera access to measure your movement. Nothing is recorded until you do." />
    );
  }
  if (permission === 'granted' && !device && deviceWaited) {
    return <CameraStage title="No camera available" detail="This phone has no back camera the app can use. Nothing was scored." />;
  }

  const live = permission === 'granted' && device != null;
  return (
    <CameraStage caption={live ? caption : 'Opening the camera…'} countLabel={live ? countLabel : undefined}>
      {live ? (
        <vision.Camera
          style={{ flex: 1 }}
          device={device}
          isActive
          resizeMode="contain"
          pixelFormat="rgb"
          audio={false}
          photo={false}
          video={false}
          frameProcessor={detection.frameProcessor}
          onLayout={(event) => {
            detection.cameraViewLayoutChangeHandler(event);
            viewSize.current = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height };
          }}
          onOutputOrientationChanged={detection.cameraOrientationChangedHandler}
        />
      ) : null}
      <PoseOverlay points={points} />
    </CameraStage>
  );
}
