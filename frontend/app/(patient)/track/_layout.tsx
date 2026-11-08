import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

// The track flow: motion-type -> method -> placement-guide -> session.
export const unstable_settings = { anchor: "motion-type/index" };

export default function TrackLayout() {
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
