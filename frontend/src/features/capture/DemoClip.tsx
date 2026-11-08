import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable } from 'react-native';
import { colors, radii } from '@/lib/theme';

type Props = {
  webm: string;
  mov: string;
  label: string;
};

/** Phones open the same public-domain clip. The web build plays it inline. */
export function DemoClip({ webm, label }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => void Linking.openURL(webm)}
      style={{
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: radii.md,
        backgroundColor: colors.graphite,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="play" size={28} color={colors.graphite} style={{ backgroundColor: colors.white, borderRadius: 28, padding: 14, overflow: 'hidden' }} />
    </Pressable>
  );
}
