import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const LINE = 'rgba(60, 55, 68, 0.042)';
const VIEWBOX_SIZE = 1000;
const CONTOUR_COUNT = 20;
const POINT_COUNT = 72;

type Point = readonly [number, number];

function midpoint(a: Point, b: Point): Point {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function makeContour(level: number): string {
  const radius = 34 + level * 50;
  const centerX = 448 + level * 2.5;
  const centerY = 438 - level * 1.4;
  const points: Point[] = Array.from({ length: POINT_COUNT }, (_, index) => {
    const angle = (index / POINT_COUNT) * Math.PI * 2;
    const sharedShape =
      1 +
      Math.sin(angle * 2 + 0.4) * 0.11 +
      Math.sin(angle * 3 - 0.8) * 0.065 +
      Math.sin(angle * 5 + 1.2) * 0.025;
    const gradualDrift = Math.sin(angle * 4 + level * 0.16) * 5;
    const shapedRadius = radius * sharedShape + gradualDrift;

    return [
      centerX + Math.cos(angle) * shapedRadius * 0.94,
      centerY + Math.sin(angle) * shapedRadius * 1.06,
    ];
  });

  const start = midpoint(points[points.length - 1], points[0]);
  const commands = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    const end = midpoint(point, next);
    return `Q ${point[0].toFixed(1)} ${point[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
  });

  return `M ${start[0].toFixed(1)} ${start[1].toFixed(1)} ${commands.join(' ')} Z`;
}

const CONTOURS = Array.from({ length: CONTOUR_COUNT }, (_, level) => makeContour(level));

/**
 * Quiet contour-map texture for the patient and professional workspaces.
 * It stays non-interactive and deliberately faint so cards remain the focus.
 */
export function TopographicBackground() {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {CONTOURS.map((path, index) => (
          <Path key={index} d={path} fill="none" stroke={LINE} strokeWidth={1.6} />
        ))}
      </Svg>
    </View>
  );
}
