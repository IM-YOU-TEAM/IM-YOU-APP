import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { colors, space } from '@/lib/theme';
import { PillButton } from './PillButton';
import { Text } from './Text';

type Props = {
  /** Set after a failed load; shows a retry instead of the spinner. */
  error?: unknown;
  onRetry?: () => void;
  /** Minimum height so the card does not jump when content arrives. Default 160. */
  minHeight?: number;
};

/** Placeholder for data that is still loading, or that failed to load. */
export function LoadState({ error, onRetry, minHeight = 160 }: Props) {
  if (!error) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading"
        style={{ minHeight, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator color={colors.seagrass} />
      </View>
    );
  }

  return (
    <View style={{ minHeight, alignItems: 'center', justifyContent: 'center', gap: space.md, paddingVertical: space.lg }}>
      <Ionicons name="cloud-offline" size={28} color={colors.textMuted} />
      <Text variant="callout" muted align="center" style={{ maxWidth: 300 }}>
        We couldn't load this. Check your connection and try again.
      </Text>
      {onRetry ? <PillButton label="Try again" icon="refresh" variant="secondary" onPress={onRetry} style={{ alignSelf: 'center' }} /> : null}
    </View>
  );
}
