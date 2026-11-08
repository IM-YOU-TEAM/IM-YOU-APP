import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const LINE = 'rgba(60, 55, 68, 0.052)';

/**
 * Quiet contour-map texture for the patient and professional workspaces.
 * It stays non-interactive and deliberately faint so cards remain the focus.
 */
export function TopographicBackground() {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        <Path
          d="M-90 126C70 45 172 71 286 142c92 57 184 70 306 24 145-55 282-53 499 70"
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <Path
          d="M-106 183C61 99 162 117 272 184c103 63 210 76 337 28 145-55 286-42 510 99"
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <Path
          d="M-121 245C42 167 147 169 256 235c112 68 229 83 367 32 151-56 299-26 520 127"
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />

        <Path
          d="M683-54c-99 43-157 118-143 210 17 109 112 137 127 222 15 87-49 151-149 201-109 55-137 144-81 218 61 80 200 69 281 7"
          fill="none"
          stroke={LINE}
          strokeWidth={1.7}
        />
        <Path
          d="M757-44c-104 58-143 128-119 210 26 89 106 112 121 190 17 91-41 165-139 220-95 54-111 128-54 180 53 48 144 43 214-3"
          fill="none"
          stroke={LINE}
          strokeWidth={1.7}
        />
        <Path
          d="M829-24c-91 66-111 131-77 197 38 75 100 96 112 170 15 91-36 172-120 224-70 43-77 99-28 132 40 27 103 22 156-17"
          fill="none"
          stroke={LINE}
          strokeWidth={1.7}
        />

        <Path
          d="M-90 801c119-89 239-100 344-27 82 57 128 142 235 151 116 10 201-80 302-65 85 13 155 75 230 176"
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
        <Path
          d="M-91 872c125-91 245-99 348-23 76 56 124 128 228 137 113 10 198-71 299-55 91 14 159 79 232 176"
          fill="none"
          stroke={LINE}
          strokeWidth={2}
        />
      </Svg>
    </View>
  );
}
