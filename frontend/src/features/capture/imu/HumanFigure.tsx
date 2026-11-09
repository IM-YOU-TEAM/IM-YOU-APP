import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { colors } from '@/lib/theme';

const SKIN = colors.honeydew;
const SKIN_DEEP = '#B9CDBA';
const HAIR = colors.graphite;

/**
 * Front-view person with head, hair, torso, arms and legs. Used on the phone-setup
 * drawings so the markers sit on a body, not a stack of rounded bars.
 */
export function HumanFigure() {
  return (
    <G>
      {/* Hair sits behind the head */}
      <Ellipse cx={100} cy={34} rx={20} ry={24} fill={HAIR} />
      <Ellipse cx={100} cy={40} rx={18} ry={21} fill={SKIN} />
      <Ellipse cx={93} cy={38} rx={3.2} ry={2.2} fill={HAIR} fillOpacity={0.18} />
      <Ellipse cx={107} cy={38} rx={3.2} ry={2.2} fill={HAIR} fillOpacity={0.18} />

      {/* Neck */}
      <Rect x={93} y={56} width={14} height={18} rx={5} fill={SKIN} />

      {/* Torso: shoulders wider than the waist */}
      <Path
        d="M 62 76 C 48 80 44 96 50 122 L 58 156 C 62 162 70 164 80 164 L 120 164 C 130 164 138 162 142 156 L 150 122 C 156 96 152 80 138 76 C 124 70 76 70 62 76 Z"
        fill={SKIN}
      />
      <Path
        d="M 88 78 C 80 100 82 130 90 158 L 110 158 C 118 130 120 100 112 78 Z"
        fill={SKIN_DEEP}
        fillOpacity={0.35}
      />

      {/* Arms, hanging at the sides */}
      <Path
        d="M 58 82 C 40 90 34 120 36 152 C 36 164 48 166 52 156 C 50 126 52 98 68 84 Z"
        fill={SKIN}
      />
      <Path
        d="M 142 82 C 160 90 166 120 164 152 C 164 164 152 166 148 156 C 150 126 148 98 132 84 Z"
        fill={SKIN}
      />
      <Ellipse cx={44} cy={160} rx={8} ry={10} fill={SKIN} />
      <Ellipse cx={156} cy={160} rx={8} ry={10} fill={SKIN} />

      {/* Person's right leg is on the viewer's left — that is where the sensors go. */}
      <Path
        d="M 62 162 C 56 168 54 190 56 218 L 58 278 C 58 288 70 292 78 286 L 76 218 C 78 190 80 168 86 164 Z"
        fill={SKIN}
      />
      <Path
        d="M 138 162 C 144 168 146 190 144 218 L 142 278 C 142 288 130 292 122 286 L 124 218 C 122 190 120 168 114 164 Z"
        fill={SKIN}
      />
      <Path d="M 52 278 C 50 286 62 294 80 290 L 78 282 C 68 286 58 282 56 278 Z" fill={HAIR} fillOpacity={0.55} />
      <Path d="M 148 278 C 150 286 138 294 120 290 L 122 282 C 132 286 142 282 144 278 Z" fill={HAIR} fillOpacity={0.55} />

      {/* Soft face, so the head reads as a person and not a bubble */}
      <Circle cx={93} cy={42} r={1.6} fill={HAIR} fillOpacity={0.35} />
      <Circle cx={107} cy={42} r={1.6} fill={HAIR} fillOpacity={0.35} />
      <Path d="M 96 50 Q 100 53 104 50" stroke={HAIR} strokeOpacity={0.28} strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </G>
  );
}
