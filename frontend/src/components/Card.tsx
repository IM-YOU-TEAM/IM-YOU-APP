import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, continuous, radii, shadows, space } from '@/lib/theme';
import { OnDark } from './Text';

export type CardTone = 'white' | 'pale' | 'dark' | 'accent';

type Props = ViewProps & {
  /**
   * white  = main card (default)
   * pale   = Honeydew-ish secondary block
   * dark   = Graphite block with white text (max one per screen)
   * accent = Cherry Blossom block with Graphite text (max one per screen, counts as the screen's highlight)
   */
  tone?: CardTone;
  /** Inner padding. Default 20. Pass 0 for edge-to-edge content. */
  padding?: number;
};

const FILL: Record<CardTone, string> = {
  white: colors.white,
  pale: colors.honeydewLight,
  dark: colors.graphite,
  accent: colors.cherry,
};

const EDGE: Record<CardTone, string> = {
  white: colors.glassBorder,
  pale: colors.border,
  dark: colors.whiteTint,
  accent: colors.border,
};

/** Rounded block with iOS continuous corners and a barely-there shadow. The basic bento tile. */
export function Card({ tone = 'white', padding = space.xl - 4, style, children, ...rest }: Props) {
  const body = (
    <View
      {...rest}
      style={[
        {
          backgroundColor: FILL[tone],
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: EDGE[tone],
          borderRadius: radii.card,
          padding,
          ...continuous,
        },
        tone === 'pale' ? null : shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
  return tone === 'dark' ? <OnDark>{body}</OnDark> : body;
}
