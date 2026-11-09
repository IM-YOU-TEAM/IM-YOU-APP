import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/lib/theme';
import { HumanFigure } from './HumanFigure';

/** Right thigh and right shin, the two sites the model was trained on. */
export function TwoPhonePlacement() {
  const thigh = { x: 68, y: 198 };
  const shank = { x: 66, y: 250 };

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 300" preserveAspectRatio="xMidYMid meet">
      <HumanFigure />
      <Phone x={thigh.x} y={thigh.y} />
      <Phone x={shank.x} y={shank.y} />
      <SvgText x={thigh.x + 26} y={thigh.y + 4} fill={colors.graphite} fontSize={11} fontWeight="700">
        Thigh
      </SvgText>
      <SvgText x={shank.x + 26} y={shank.y + 4} fill={colors.graphite} fontSize={11} fontWeight="700">
        Shin
      </SvgText>
    </Svg>
  );
}

function Phone({ x, y }: { x: number; y: number }) {
  return (
    <G>
      <Circle cx={x} cy={y} r={22} fill={colors.seagrass} fillOpacity={0.16} />
      <Rect x={x - 8} y={y - 13} width={16} height={26} rx={4} fill={colors.seagrass} stroke={colors.white} strokeWidth={2} />
      <Rect x={x - 3} y={y - 10} width={6} height={2} rx={1} fill={colors.white} />
    </G>
  );
}
