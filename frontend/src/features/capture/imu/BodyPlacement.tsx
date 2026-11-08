import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import type { BodySpot } from '../placementSteps';

type Props = { spot: BodySpot };

// Body: 200 x 300, front view built from rounded shapes. Lower back uses the same shape seen from behind.
const BODY = colors.honeydew;

// Center of the phone for each spot.
const SPOTS: Record<BodySpot, { x: number; y: number }> = {
  pocket: { x: 84, y: 176 },
  waist: { x: 100, y: 140 },
  thigh: { x: 70, y: 200 },
  lowerBack: { x: 100, y: 146 },
};

/** Simple body silhouette with the phone's position highlighted. */
export function BodyPlacement({ spot }: Props) {
  const p = SPOTS[spot];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
      <G>
        <Circle cx={100} cy={36} r={22} fill={BODY} />
        <Rect x={92} y={54} width={16} height={16} rx={6} fill={BODY} />
        <Rect x={64} y={66} width={72} height={100} rx={30} fill={BODY} />
        <Rect x={42} y={72} width={20} height={96} rx={10} fill={BODY} />
        <Rect x={138} y={72} width={20} height={96} rx={10} fill={BODY} />
        <Rect x={68} y={146} width={30} height={136} rx={15} fill={BODY} />
        <Rect x={102} y={146} width={30} height={136} rx={15} fill={BODY} />
      </G>

      {/* Back view hint: a spine line */}
      {spot === 'lowerBack' && (
        <Line x1={100} y1={74} x2={100} y2={160} stroke={colors.graphite} strokeOpacity={0.25} strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
      )}
      {/* Waist-worn spots get a belt */}
      {(spot === 'waist' || spot === 'lowerBack') && <Rect x={64} y={137} width={72} height={8} rx={4} fill={colors.graphite} fillOpacity={0.5} />}

      {/* The phone */}
      <Circle cx={p.x} cy={p.y} r={26} fill={colors.seagrass} fillOpacity={0.16} />
      <Circle cx={p.x} cy={p.y} r={17} fill={colors.seagrass} fillOpacity={0.22} />
      <Rect x={p.x - 9} y={p.y - 15} width={18} height={30} rx={5} fill={colors.seagrass} stroke={colors.white} strokeWidth={2} />
      <Rect x={p.x - 3} y={p.y - 11} width={6} height={2} rx={1} fill={colors.white} />
    </Svg>
  );
}
