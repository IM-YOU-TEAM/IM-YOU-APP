import Svg, { Circle, G, Line, Polygon, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import type { MotionType } from '@/types';
import { GROUND_Y } from './pose';
import { SkeletonFigure } from './SkeletonFigure';

type Props = { motion: MotionType };

// Scene: 340 x 220, ground at y = 190. Phone on a floor tripod at the left, you side-on at the right.
const W = 340;
const H = 220;
const GROUND = 190;
const SCALE = 0.62;
const PERSON_X = 236; // where the figure's hip lands
const LENS = { x: 50, y: 150 };
const SCENERY = 'rgba(60, 55, 68, 0.18)';

// A still frame that reads well for each motion.
const STILL_T: Record<MotionType, number> = { chairStand: 0 };

/** Side view of the camera setup: floor-level phone, its field of view, and you fully in frame. */
export function CameraSetup({ motion }: Props) {
  const tx = PERSON_X - 96 * SCALE;
  const ty = GROUND - (GROUND_Y + 3) * SCALE;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* Field of view */}
      <Polygon points={`${LENS.x},${LENS.y} ${W - 8},28 ${W - 8},${GROUND}`} fill={colors.seagrass} fillOpacity={0.1} />
      <Line x1={LENS.x} y1={LENS.y} x2={W - 8} y2={28} stroke={colors.seagrass} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="5 5" />
      <Line x1={LENS.x} y1={LENS.y} x2={W - 8} y2={GROUND} stroke={colors.seagrass} strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray="5 5" />

      {/* Ground */}
      <Line x1={8} x2={W - 8} y1={GROUND} y2={GROUND} stroke={SCENERY} strokeWidth={2} strokeLinecap="round" />

      {/* You */}
      <G transform={`translate(${tx} ${ty}) scale(${SCALE})`}>
        <SkeletonFigure motion={motion} t={STILL_T[motion]} bone={colors.graphite} joint={colors.graphite} scenery={SCENERY} />
      </G>

      {/* Phone on a small floor tripod */}
      <Line x1={44} y1={172} x2={32} y2={GROUND} stroke={colors.graphite} strokeWidth={3} strokeLinecap="round" />
      <Line x1={44} y1={172} x2={56} y2={GROUND} stroke={colors.graphite} strokeWidth={3} strokeLinecap="round" />
      <Line x1={44} y1={172} x2={44} y2={GROUND} stroke={colors.graphite} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={LENS.x - 6} cy={LENS.y + 6} r={22} fill={colors.seagrass} fillOpacity={0.16} />
      <Rect x={37} y={138} width={14} height={34} rx={4} fill={colors.seagrass} />
      <Circle cx={LENS.x} cy={LENS.y} r={2.5} fill={colors.white} />

      {/* Distance */}
      <Line x1={44} x2={PERSON_X} y1={206} y2={206} stroke={colors.graphite} strokeOpacity={0.5} strokeWidth={1.5} />
      <Line x1={44} x2={44} y1={200} y2={212} stroke={colors.graphite} strokeOpacity={0.5} strokeWidth={1.5} />
      <Line x1={PERSON_X} x2={PERSON_X} y1={200} y2={212} stroke={colors.graphite} strokeOpacity={0.5} strokeWidth={1.5} />
    </Svg>
  );
}
