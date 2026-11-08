import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors, continuous, MIN_HIT, radii, space, typeStyle } from '@/lib/theme';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown under the field in cherry when validation or sign-in fails. */
  error?: string;
};

export function TextField({ label, error, ...input }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...input}
        onFocus={(event) => {
          setFocused(true);
          input.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          input.onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, !!error && styles.errored]}
      />
      {error ? (
        <Text variant="caption" color={colors.graphite}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: space.xs,
  },
  input: {
    ...typeStyle('body'),
    color: colors.text,
    minHeight: MIN_HIT + 4,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...continuous,
  },
  focused: {
    borderColor: colors.seagrass,
    borderWidth: 1.5,
  },
  errored: {
    borderColor: colors.cherry,
    borderWidth: 1.5,
  },
});
