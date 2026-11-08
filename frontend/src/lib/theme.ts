// Design tokens for I'M U. Every screen and component reads from here.
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

// ---------- Color ----------
// Five brand colors, plus a few derived alpha variants. Light mode only.
export const colors = {
  seagrass: '#269F86', // primary: nav, selected pills, primary buttons, chart lines, hero tile
  seagrassDark: '#1E8571', // pressed / hover state of seagrass surfaces
  honeydew: '#D0E1D1', // app background
  honeydewLight: '#E8F0E8', // pale cards, unselected list cards
  cherry: '#EDAFB8', // accent ONLY (one highlight per screen)
  graphite: '#3C3744', // text, icons, dark bento tile
  white: '#FFFFFF', // main cards

  // Text
  text: '#3C3744',
  textMuted: 'rgba(60, 55, 68, 0.78)', // secondary text; passes AA on white and honeydew
  onSeagrass: '#FFFFFF', // only for bold >= 14 or regular >= 18
  onSeagrassMuted: 'rgba(255, 255, 255, 0.86)', // secondary text on seagrass (keep it bold)
  onDark: '#FFFFFF', // text on graphite
  onDarkMuted: 'rgba(255, 255, 255, 0.74)', // secondary text on graphite

  // Lines and fills (iOS-style: hairline separators, tinted neutral fills)
  border: 'rgba(60, 55, 68, 0.10)',
  divider: 'rgba(60, 55, 68, 0.08)',
  separator: 'rgba(60, 55, 68, 0.14)', // hairline (StyleSheet.hairlineWidth)
  fill: 'rgba(60, 55, 68, 0.06)', // segmented-control tracks, quiet buttons
  seagrassTint: 'rgba(38, 159, 134, 0.12)', // icon bubbles, soft highlights
  whiteTint: 'rgba(255, 255, 255, 0.20)', // icon bubbles / active pills on seagrass

  // Gloss
  glass: 'rgba(255, 255, 255, 0.68)', // translucent fill behind blur (iOS "regular material")
  glassBorder: 'rgba(255, 255, 255, 0.85)', // 1px top highlight on glass
  gloss: 'rgba(255, 255, 255, 0.16)', // soft top sheen on seagrass surfaces
} as const;

// ---------- Shape ----------
export const radii = {
  sm: 10,
  md: 16,
  card: 22,
  lg: 28,
  pill: 999,
} as const;

/** iOS "squircle" corners. Spread into any rounded, non-pill surface: { ...continuous }. */
export const continuous = { borderCurve: 'continuous' } as const satisfies ViewStyle;

// ---------- Spacing ----------
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** The one gutter between bento blocks / cards. */
export const GAP = 16;

// ---------- Layout ----------
export const WIDE = 768; // >= this width: sidebar + multi-column layouts
export const MAX_CONTENT_WIDTH = 1120;
export const SIDEBAR_WIDTH = 240;
export const MIN_HIT = 44; // minimum touch target

// ---------- Shadow ----------
// Soft, offset shadows. iOS uses shadow*, Android uses elevation, web uses boxShadow.
function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: colors.graphite,
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur / 2,
    },
    android: { elevation, shadowColor: colors.graphite },
    default: { boxShadow: `0px ${y}px ${blur}px rgba(60, 55, 68, ${opacity})` },
  });
}

export const shadows = {
  card: shadow(2, 14, 0.06, 2), // cards: barely there, like iOS grouped content
  raised: shadow(10, 30, 0.12, 6), // floating bars, tooltips, segmented thumbs
  none: {} as ViewStyle,
} as const;

// ---------- Type ----------
// Sizes follow the iOS Dynamic Type defaults (Large Title 34, Title 2 22, Headline 17, Body 17, Subheadline 15, Footnote 13).
// Font: Plus Jakarta Sans. To swap the font, change the families here and the useFonts call in app/_layout.tsx.
export const fonts = {
  400: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
} as const;

export type FontWeight = keyof typeof fonts;

type TypeStep = { fontSize: number; lineHeight: number; weight: FontWeight; letterSpacing?: number };

export const type = {
  display: { fontSize: 34, lineHeight: 41, weight: 700, letterSpacing: -0.8 }, // large title
  title: { fontSize: 22, lineHeight: 28, weight: 700, letterSpacing: -0.4 }, // section / card title
  headline: { fontSize: 17, lineHeight: 22, weight: 600, letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 24, weight: 400, letterSpacing: -0.2 },
  callout: { fontSize: 15, lineHeight: 20, weight: 500, letterSpacing: -0.1 }, // subheadline
  caption: { fontSize: 13, lineHeight: 18, weight: 500 }, // footnote
} as const satisfies Record<string, TypeStep>;

export type TypeVariant = keyof typeof type;

/** Style object for a type step, with an optional weight override. */
export function typeStyle(variant: TypeVariant, weight?: FontWeight): TextStyle {
  const step: TypeStep = type[variant];
  return {
    fontFamily: fonts[weight ?? step.weight],
    fontSize: step.fontSize,
    lineHeight: step.lineHeight,
    letterSpacing: step.letterSpacing ?? 0,
  };
}
