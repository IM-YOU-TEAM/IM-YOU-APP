import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, continuous, radii, shadows, space } from '@/lib/theme';
import { smoothPath } from '@/lib/smoothPath';
import type { IconName } from '@/types';
import { Gloss } from './Gloss';
import { OnDark, Text } from './Text';

type Props = {
  label: string;
  value: string | number;
  /** e.g. "steps/min" */
  unit?: string;
  icon?: IconName;
  /** Values for a small decorative waveform along the bottom (any range). */
  waveform?: number[];
  /** 'hero' = glossy Seagrass (one per screen), 'plain' = white card. Default 'hero'. */
  tone?: 'hero' | 'plain';
  style?: StyleProp<ViewStyle>;
};

const WAVE_HEIGHT = 44;

/** Big-number tile, e.g. "Cadence 112 steps/min". */
export function StatTile({ label, value, unit, icon, waveform, tone = 'hero', style }: Props) {
  const hero = tone === 'hero';
  const [width, setWidth] = useState(0);

  let wave = '';
  if (waveform && waveform.length > 1 && width > 0) {
    const min = Math.min(...waveform);
    const span = Math.max(...waveform) - min || 1;
    const pts = waveform.map((v, i) => ({
      x: (i / (waveform.length - 1)) * width,
      y: 4 + (1 - (v - min) / span) * (WAVE_HEIGHT - 8),
    }));
    wave = smoothPath(pts, 0.18);
  }

  const body = (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={[styles.tile, shadows.card, style]}
    >
      {/* Fill and gloss live in a clipped layer so the outer shadow is not clipped. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { backgroundColor: hero ? colors.seagrass : colors.white }]}>
        {hero && <Gloss strength={0.14} />}
      </View>
      <View style={styles.header}>
        {icon && (
          <View style={[styles.bubble, { backgroundColor: colors.burntOrangeTint }]}>
            <Ionicons name={icon} size={20} color={colors.burntOrange} />
          </View>
        )}
        <Text variant="callout" weight={700} muted={!hero}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <Text variant="display" weight={700} style={{ fontSize: 44, lineHeight: 50, letterSpacing: -1 }}>
          {value}
        </Text>
        {unit && (
          <Text variant="callout" weight={700} muted={!hero}>
            {unit}
          </Text>
        )}
      </View>
      {wave !== '' && (
        <Svg width={width} height={WAVE_HEIGHT} style={styles.wave} pointerEvents="none">
          <Path d={wave} stroke={hero ? 'rgba(255,255,255,0.85)' : colors.seagrass} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </Svg>
      )}
    </View>
  );

  return hero ? <OnDark>{body}</OnDark> : body;
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radii.card,
    ...continuous,
    padding: space.xl - 4,
    gap: space.md,
    minHeight: 160,
  },
  clip: { borderRadius: radii.card, overflow: 'hidden', ...continuous },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs + 2 },
  // position: 'relative' keeps the svg above the absolute fill layer on web.
  wave: { position: 'relative', marginTop: 'auto', marginHorizontal: -(space.xl - 4), marginBottom: -(space.xl - 4) + 8 },
});
