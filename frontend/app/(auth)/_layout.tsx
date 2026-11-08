import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false, title: "I'M U", contentStyle: { backgroundColor: colors.honeydew } }} />;
}
