import Svg, { Circle, G, Rect, Text as SvgText } from 'react-native-svg';
import { colors } from '@/lib/theme';

const BODY = colors.honeydew;

/** Right thigh and right shin, the two sites the model was trained on. */
export function TwoPhonePlacement() {
  const thigh = { x: 70, y: 200 };
  const shank = { x: 70, y: 252 };

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

      <Phone x={thigh.x} y={thigh.y} />
      <Phone x={shank.x} y={shank.y} />
      <SvgText x={thigh.x + 28} y={thigh.y + 4} fill={colors.graphite} fontSize={11} fontWeight="700">
        Thigh
      </SvgText>
      <SvgText x={shank.x + 28} y={shank.y + 4} fill={colors.graphite} fontSize={11} fontWeight="700">
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
