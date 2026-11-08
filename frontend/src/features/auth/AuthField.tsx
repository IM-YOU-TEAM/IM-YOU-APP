import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance, type TextInputProps } from 'react-native';
import { colors, continuous, MIN_HIT, radii, space, typeStyle } from '@/lib/theme';

type Props = Omit<TextInputProps, 'style' | 'secureTextEntry'> & {
  /** Read aloud by screen readers; the placeholder is only a visual hint. */
  label: string;
  /** Password field with a show / hide toggle. */
  secure?: boolean;
};

/** Rounded white text field. Seagrass edge while focused. */
export const AuthField = forwardRef<TextInputInstance, Props>(function AuthField({ label, secure = false, onFocus, onBlur, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  return (
    <View>
      <TextInput
        ref={ref}
        {...rest}
        accessibilityLabel={label}
        secureTextEntry={secure && !revealed}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.seagrass}
        cursorColor={colors.seagrass}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          secure && { paddingRight: MIN_HIT + space.xs },
          { borderColor: focused ? colors.seagrass : colors.separator },
        ]}
      />
      {secure ? (
        <Pressable
          onPress={() => setRevealed((r) => !r)}
          accessibilityRole="button"
          accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          hitSlop={4}
          style={({ pressed }) => [styles.toggle, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  input: {
    ...typeStyle('body'),
    color: colors.text,
    minHeight: 52,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.white,
    ...continuous,
  },
  toggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: space.xs,
    width: MIN_HIT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
