import Svg, { Circle, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';
import type { BodySpot } from '../placementSteps';
import { HumanFigure } from './HumanFigure';

type Props = { spot: BodySpot };

const SPOTS: Record<BodySpot, { x: number; y: number }> = {
  pocket: { x: 78, y: 176 },
  waist: { x: 100, y: 150 },
  thigh: { x: 68, y: 200 },
  lowerBack: { x: 100, y: 148 },
};

/** Person silhouette with the phone's position highlighted. */
export function BodyPlacement({ spot }: Props) {
  const p = SPOTS[spot];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
      <HumanFigure />
      <Circle cx={p.x} cy={p.y} r={26} fill={colors.seagrass} fillOpacity={0.16} />
      <Circle cx={p.x} cy={p.y} r={17} fill={colors.seagrass} fillOpacity={0.22} />
      <Rect x={p.x - 9} y={p.y - 15} width={18} height={30} rx={5} fill={colors.seagrass} stroke={colors.white} strokeWidth={2} />
      <Rect x={p.x - 3} y={p.y - 11} width={6} height={2} rx={1} fill={colors.white} />
    </Svg>
  );
}
