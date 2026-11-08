import { View, type ViewProps } from 'react-native';
import { colors, radii, shadows, space } from '@/lib/theme';
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

/** Rounded block with a soft shadow. The basic bento tile. */
export function Card({ tone = 'white', padding = space.xl - 4, style, children, ...rest }: Props) {
  const body = (
    <View
      {...rest}
      style={[
        { backgroundColor: FILL[tone], borderRadius: radii.card, padding },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
  return tone === 'dark' ? <OnDark>{body}</OnDark> : body;
}
