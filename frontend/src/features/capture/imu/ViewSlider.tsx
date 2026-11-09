import { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { colors } from '@/lib/theme';

type Props = {
  /** 0 to 1. */
  value: number;
  onChange: (value: number) => void;
  label: string;
  valueText: string;
};

const TOUCH_H = 32;
const RAIL_H = 6;
const THUMB = 24;
const STEP = 0.1;

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

/** A drag-or-tap slider for the dark chart card. */
export function ViewSlider({ value, onChange, label, valueText }: Props) {
  const [width, setWidth] = useState(0);
  const widthRef = useRef(0);
  const grabbed = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          const usable = Math.max(widthRef.current - THUMB, 1);
          grabbed.current = clamp01((e.nativeEvent.locationX - THUMB / 2) / usable);
          onChangeRef.current(grabbed.current);
        },
        onPanResponderMove: (_, g) => {
          const usable = Math.max(widthRef.current - THUMB, 1);
          onChangeRef.current(clamp01(grabbed.current + g.dx / usable));
        },
      }),
    [],
  );

  const v = clamp01(value);
  const usable = Math.max(width - THUMB, 0);

  return (
    <View
      {...responder.panHandlers}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
        setWidth(e.nativeEvent.layout.width);
      }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(clamp01(v + (e.nativeEvent.actionName === 'increment' ? STEP : -STEP)))}
      style={{ height: TOUCH_H, justifyContent: 'center', cursor: 'pointer' }}
    >
      <View pointerEvents="none" style={{ marginHorizontal: THUMB / 2, height: RAIL_H, borderRadius: RAIL_H / 2, backgroundColor: 'rgba(255,255,255,0.14)' }}>
        <View style={{ width: v * usable, height: RAIL_H, borderRadius: RAIL_H / 2, backgroundColor: colors.seagrass }} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: v * usable,
          width: THUMB,
          height: THUMB,
          borderRadius: THUMB / 2,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000000',
          shadowOpacity: 0.3,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      />
    </View>
  );
}
