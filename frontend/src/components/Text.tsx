import { createContext, useContext, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typeStyle, type FontWeight, type TypeVariant } from '@/lib/theme';

export type TextProps = RNTextProps & {
  /** Type scale step. Default 'body'. */
  variant?: TypeVariant;
  /** Text color. Default Graphite (white inside an <OnDark> surface). */
  color?: string;
  /** Secondary text: reduced-opacity Graphite (or reduced-opacity white on dark). Ignored when `color` is set. */
  muted?: boolean;
  /** Override the variant's weight (400 | 500 | 600 | 700 | 800). */
  weight?: FontWeight;
  align?: 'left' | 'center' | 'right';
};

const DarkSurface = createContext(false);

/**
 * Wrap content on a Seagrass or Graphite surface so every <Text> inside defaults to white.
 * Card tone="dark", StatTile, Sidebar and selected ListCards already do this for you.
 */
export function OnDark({ children }: { children: ReactNode }) {
  return <DarkSurface.Provider value>{children}</DarkSurface.Provider>;
}

/** The only text component screens should use. Applies the brand font and type scale. */
export function Text({ variant = 'body', color, muted, weight, align, style, ...rest }: TextProps) {
  const dark = useContext(DarkSurface);
  const base = dark ? colors.onDark : colors.text;
  const soft = dark ? colors.onDarkMuted : colors.textMuted;
  const textColor = color ?? (muted ? soft : base);
  return (
    <RNText
      {...rest}
      style={[typeStyle(variant, weight), { color: textColor }, align && { textAlign: align }, style]}
    />
  );
}
