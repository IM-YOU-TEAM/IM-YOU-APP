import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function AuthLayout() {
<<<<<<< HEAD
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        title: "I'M YOU",
        contentStyle: { backgroundColor: colors.honeydew },
      }}
    />
  );
=======
  return <Stack screenOptions={{ headerShown: false, title: "I'M YOU", contentStyle: { backgroundColor: colors.honeydew } }} />;
>>>>>>> origin/main
}
