import { Image, View, type ImageSourcePropType } from 'react-native';
import { colors } from '@/lib/theme';
import type { BodySpot } from '../placementSteps';

declare function require(moduleId: string): unknown;

const FIGURE = require('../../../../assets/placement-guides/body.png') as ImageSourcePropType;
const FIGURE_RATIO = 336 / 520;

// Center of the phone for each spot, as a share of the figure's width and height.
const SPOTS: Record<BodySpot, { x: number; y: number }> = {
  pocket: { x: 0.43, y: 0.49 },
  waist: { x: 0.5, y: 0.43 },
  thigh: { x: 0.42, y: 0.6 },
  lowerBack: { x: 0.5, y: 0.44 },
};

const PHONE_W = 16;
const PHONE_H = 28;
const HALO = 44;

/** Body figure with the phone's position highlighted. */
export function BodyPlacement({ spot }: { spot: BodySpot }) {
  const p = SPOTS[spot];
  return (
    <View style={{ height: '100%', aspectRatio: FIGURE_RATIO, alignSelf: 'center' }}>
      <Image source={FIGURE} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
      <View
        style={{
          position: 'absolute',
          left: `${p.x * 100}%`,
          top: `${p.y * 100}%`,
          width: HALO,
          height: HALO,
          marginLeft: -HALO / 2,
          marginTop: -HALO / 2,
          borderRadius: HALO / 2,
          backgroundColor: colors.seagrassTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: PHONE_W,
            height: PHONE_H,
            borderRadius: 4,
            backgroundColor: colors.seagrass,
            borderWidth: 2,
            borderColor: colors.white,
          }}
        />
      </View>
    </View>
  );
}
