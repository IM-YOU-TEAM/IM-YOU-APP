import { Image, View } from "react-native";

type Props = {
  /** Height of the mark in px. Default 36. */
  size?: number;
  /** 'full' = mark + wordmark, 'mark' = icon only. Default 'full'. */
  variant?: "full" | "mark";
  /** Included to preserve compatibility with existing layout calls. */
  onDark?: boolean;
};

export function Logo({ size = 36 }: Props) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="I'M U"
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "transparent", // Ensure wrapper has no white fill
      }}
    >
      <Image
        source={require("../../assets/logo.png")}
        style={{
          width: size * 1.5, // Adjust width based on your image aspect ratio
          height: size,
          resizeMode: "contain",
        }}
      />
    </View>
  );
}
