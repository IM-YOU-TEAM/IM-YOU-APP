import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii } from '@/lib/theme';
import type { MotionType } from '@/types';
import { usePhase } from '../usePhase';
import { VIEW_H, VIEW_W } from './pose';
import { SkeletonFigure } from './SkeletonFigure';

type Props = {
  motion: MotionType;
  /** False when paused or when Reduce Motion is on: the figure holds still. */
  running: boolean;
};

const CORNER = 'M 0 22 V 8 Q 0 0 8 0 H 22';

/**
 * Mock camera view: a dark panel (no real camera) with viewfinder corners
 * and an animated stick-figure skeleton, like pose tracking would draw.
 */
export function LiveSkeleton({ motion, running }: Props) {
  const t = usePhase(running);
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Camera preview with a tracked body skeleton"
      style={{ flex: 1, minHeight: 300, borderRadius: radii.card, backgroundColor: colors.graphite, overflow: 'hidden', padding: 20 }}
    >
      {/* Viewfinder corners */}
      {[0, 90, 180, 270].map((deg) => (
        <Svg
          key={deg}
          width={22}
          height={22}
          style={{
            position: 'absolute',
            top: deg < 180 ? 16 : undefined,
            bottom: deg >= 180 ? 16 : undefined,
            left: deg === 0 || deg === 270 ? 16 : undefined,
            right: deg === 90 || deg === 180 ? 16 : undefined,
            transform: [{ rotate: `${deg}deg` }],
          }}
        >
          <Path d={CORNER} stroke={colors.onDarkMuted} strokeWidth={3} fill="none" strokeLinecap="round" />
        </Svg>
      ))}
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet">
        <SkeletonFigure motion={motion} t={t} bone={colors.seagrass} joint={colors.white} scenery="rgba(255,255,255,0.22)" />
      </Svg>
    </View>
  );
}
