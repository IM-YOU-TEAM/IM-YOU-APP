import { useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Text } from '@/components';
import { colors, radii } from '@/lib/theme';
import { POSE_BONES, VISIBLE, containPoint } from './landmarks';
import type { Vec3 } from './poseTypes';

const CORNER = 'M 0 22 V 8 Q 0 0 8 0 H 22';

type StageProps = {
  children?: ReactNode;
  /** Replaces the preview. Used when the camera or the model cannot run. */
  title?: string;
  detail?: string;
  caption?: string;
  countLabel?: string;
};

/** Graphite preview panel with viewfinder corners. The live camera and the skeleton sit inside it. */
export function CameraStage({ children, title, detail, caption, countLabel }: StageProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={title ?? 'Camera preview with a tracked body skeleton'}
      style={{ flex: 1, borderRadius: radii.card, backgroundColor: colors.graphite, overflow: 'hidden' }}
    >
      <ViewfinderCorners />
      {title ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 }}>
          <Text variant="headline" align="center" color={colors.onDark}>
            {title}
          </Text>
          {detail ? (
            <Text variant="callout" align="center" color={colors.onDarkMuted}>
              {detail}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={{ flex: 1, position: 'relative' }}>{children}</View>
      )}
      {countLabel && !title ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: 'rgba(60, 55, 68, 0.72)', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 }}
        >
          <Text variant="callout" color={colors.onDark} style={{ fontVariant: ['tabular-nums'] }}>
            {countLabel}
          </Text>
        </View>
      ) : null}
      {caption && !title ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'center' }}>
          <View style={{ backgroundColor: 'rgba(60, 55, 68, 0.72)', borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 420 }}>
            <Text variant="callout" align="center" color={colors.onDark}>
              {caption}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ViewfinderCorners() {
  return (
    <>
      {[0, 90, 180, 270].map((deg) => (
        <Svg
          key={deg}
          width={22}
          height={22}
          style={{
            position: 'absolute',
            top: deg < 180 ? 16 : undefined,
            bottom: deg >= 180 ? 16 : undefined,
            left: deg === 0 || deg === 270 ? 16 : undefined,
            right: deg === 90 || deg === 180 ? 16 : undefined,
            transform: [{ rotate: `${deg}deg` }],
            zIndex: 2,
          }}
        >
          <Path d={CORNER} stroke={colors.onDarkMuted} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      ))}
    </>
  );
}

type OverlayProps = {
  /** Image points. With a frame size, they are 0–1 inside the camera frame. Without one, they are already 0–1 in this view. */
  points: Vec3[] | null;
  frameWidth?: number;
  frameHeight?: number;
};

const SMOOTH = 0.38;

function blend(from: Vec3, to: Vec3): Vec3 {
  if (to.visibility < VISIBLE) return to;
  return {
    x: from.x + SMOOTH * (to.x - from.x),
    y: from.y + SMOOTH * (to.y - from.y),
    z: from.z + SMOOTH * (to.z - from.z),
    visibility: to.visibility,
  };
}

/** Skeleton drawn over the preview. Points under the visibility cutoff are left out. */
export function PoseOverlay({ points, frameWidth = 0, frameHeight = 0 }: OverlayProps) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const prev = useRef<Vec3[] | null>(null);
  let smoothed: Vec3[] | null = null;
  if (points == null) {
    prev.current = null;
  } else if (prev.current == null || prev.current.length !== points.length) {
    prev.current = points;
    smoothed = points;
  } else {
    smoothed = points.map((point, index) => blend(prev.current![index], point));
    prev.current = smoothed;
  }
  const placed =
    smoothed == null
      ? null
      : frameWidth > 0 && frameHeight > 0
        ? smoothed.map((point) => containPoint(point, box.w, box.h, frameWidth, frameHeight))
        : smoothed;

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {placed && box.w > 0 ? (
        <Svg width="100%" height="100%" viewBox="0 0 1 1" preserveAspectRatio="none">
          {POSE_BONES.map(([a, b]) => {
            const start = placed[a];
            const end = placed[b];
            if (!start || !end || start.visibility < VISIBLE || end.visibility < VISIBLE) return null;
            return (
              <Line
                key={`${a}-${b}`}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={colors.seagrass}
                strokeWidth={0.012}
                strokeLinecap="round"
              />
            );
          })}
          {placed.map((point, index) =>
            point.visibility < VISIBLE ? null : <Circle key={index} cx={point.x} cy={point.y} r={0.016} fill={colors.white} />,
          )}
        </Svg>
      ) : null}
    </View>
  );
}
