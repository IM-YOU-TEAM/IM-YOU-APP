import { Image, type ImageSourcePropType } from 'react-native';

declare function require(moduleId: string): unknown;

const FIGURE = require('../../../../assets/placement-guides/two-phones.png') as ImageSourcePropType;

/** Right thigh and right shin, the two sites the model was trained on. */
export function TwoPhonePlacement() {
  return <Image source={FIGURE} resizeMode="contain" style={{ width: '100%', height: '100%' }} />;
}
