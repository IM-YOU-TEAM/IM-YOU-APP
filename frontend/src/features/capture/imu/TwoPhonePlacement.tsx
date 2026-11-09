import { Image, View, type ImageSourcePropType } from 'react-native';
import { colors, radii } from '@/lib/theme';

declare function require(moduleId: string): unknown;

const FIGURE = require('../../../../assets/placement-guides/two-phones.png') as ImageSourcePropType;
const FIGURE_RATIO = 275 / 572;

/** Right thigh and right shin, the two sites the model was trained on. */
export function TwoPhonePlacement() {
  return (
    <View style={{ height: '100%', aspectRatio: FIGURE_RATIO, alignSelf: 'center', borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.white }}>
      <Image source={FIGURE} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
    </View>
  );
}
