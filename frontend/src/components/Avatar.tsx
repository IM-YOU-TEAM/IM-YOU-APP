import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/lib/theme';
import { Text } from './Text';

type Props = {
  name: string;
  /** 'sm' 36, 'md' 48 (default), 'lg' 72, or a number in px. */
  size?: 'sm' | 'md' | 'lg' | number;
  /** 'seagrass' = solid with white initials (default), 'pale' = Honeydew with Graphite initials. */
  tone?: 'seagrass' | 'pale';
  style?: StyleProp<ViewStyle>;
};

const SIZES = { sm: 36, md: 48, lg: 72 } as const;

/** "Dr. Ana Diaz" -> "AD" (titles are skipped) */
function initials(name: string): string {
  const words = name.replace(/^(dr|mr|ms|mrs)\.?\s+/i, '').trim().split(/\s+/);
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
}

/** Initials in a circle. No photos in the demo. */
export function Avatar({ name, size = 'md', tone = 'seagrass', style }: Props) {
  const px = typeof size === 'number' ? size : SIZES[size];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: px,
          height: px,
          borderRadius: px / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone === 'seagrass' ? colors.seagrass : colors.honeydew,
        },
        style,
      ]}
    >
      <Text
        weight={800}
        color={tone === 'seagrass' ? colors.onSeagrass : colors.graphite}
        style={{ fontSize: Math.round(px * 0.38), lineHeight: Math.round(px * 0.46) }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
