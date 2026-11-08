import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

// The track flow: motion-type -> method -> placement-guide -> session.
export const unstable_settings = { anchor: 'motion-type/index' };

export default function TrackLayout() {
  return <Stack screenOptions={{ headerShown: false, title: "I'M U", contentStyle: { backgroundColor: colors.honeydew } }} />;
}
