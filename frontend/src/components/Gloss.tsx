import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /** Peak white opacity at the top edge. Default 0.2. */
  strength?: number;
};

/**
 * Soft glossy sheen: white fading to clear over the top half.
 * Place as the first child of a Seagrass surface that clips (overflow: 'hidden' + borderRadius).
 * Used by PillButton, StatTile and Sidebar. Decorative only.
 */
export function Gloss({ strength = 0.2 }: Props) {
  const id = `gloss${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={strength} />
          <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
