/** One MediaPipe body point. Image points are 0–1 in the frame; world points are meters, hip at the origin, y up. */
export type Vec3 = {
  x: number;
  y: number;
  z: number;
  /** 0–1. World points copy this from the matching image point, because world visibility is often empty. */
  visibility: number;
};

/** One camera frame the metric engine understands. Both camera shells produce this. */
export type PoseFrame = {
  tMs: number;
  image: Vec3[];
  world: Vec3[];
};

/**
 * What we keep for the model that will run elsewhere later.
 * Joint positions only: no image, no video.
 */
export type PoseSample = {
  tMs: number;
  world: Vec3[];
};

export type CameraGate = 'starting' | 'ready' | 'denied' | 'unavailable' | 'model-error';

export type PoseCameraProps = {
  paused: boolean;
  /** Shown over a live preview, e.g. the step-back line. Ignored while the camera is blocked. */
  caption?: string;
  /** Live count, e.g. "4 steps". Shown once the camera is ready. */
  countLabel?: string;
  onFrame: (frame: PoseFrame | null) => void;
  onGate: (gate: CameraGate) => void;
};
