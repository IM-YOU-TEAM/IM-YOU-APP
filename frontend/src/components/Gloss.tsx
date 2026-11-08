import { StyleSheet, View } from 'react-native';

type Props = {
  /** Peak white opacity at the top edge. Default 0.2. */
  strength?: number;
};

/**
 * Soft inner-edge sheen for a colored material.
 * Place as the first child of a Seagrass surface that clips (overflow: 'hidden' + borderRadius).
 * A native View avoids percentage-sized SVG seams on rounded iOS controls.
 */
export function Gloss({ strength = 0.2 }: Props) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth * 2,
          backgroundColor: `rgba(255, 255, 255, ${strength})`,
        }}
      />
    </View>
  );
}
