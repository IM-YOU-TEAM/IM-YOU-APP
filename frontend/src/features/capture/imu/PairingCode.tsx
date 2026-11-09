import qrcode from 'qrcode-generator';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { PillButton, Text } from '@/components';
import { colors, radii, space } from '@/lib/theme';
import { pairingUrl } from './pairingApi';

type Props = {
  code: string | null;
  expiresAt: number | null;
  onRenew: () => void;
};

/** White margin, in modules, that phone cameras need around a QR code. */
const QUIET = 4;
const TARGET_PX = 200;

/** Dark modules as one path, merging each row's runs so the string stays short. */
function qrPath(text: string): { d: string; modules: number } {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const modules = qr.getModuleCount();
  let d = '';
  for (let row = 0; row < modules; row++) {
    let col = 0;
    while (col < modules) {
      if (!qr.isDark(row, col)) {
        col++;
        continue;
      }
      const from = col;
      while (col < modules && qr.isDark(row, col)) col++;
      d += `M${from} ${row}h${col - from}v1h${from - col}z`;
    }
  }
  return { d, modules };
}

function useExpired(expiresAt: number | null): boolean {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresAt == null) return;
    const wait = expiresAt - Date.now();
    if (wait <= 0) {
      setNow(Date.now());
      return;
    }
    const id = setTimeout(() => setNow(Date.now()), wait + 50);
    return () => clearTimeout(id);
  }, [expiresAt]);
  return expiresAt != null && now >= expiresAt;
}

/** The signed-in phone's QR code. The second phone scans it with the camera and joins without an account. */
export function PairingCode({ code, expiresAt, onRenew }: Props) {
  const expired = useExpired(expiresAt);
  const qr = useMemo(() => (code ? qrPath(pairingUrl(code)) : null), [code]);
  const total = qr ? qr.modules + 2 * QUIET : 0;
  // Whole pixels per module keep the edges crisp enough for older cameras.
  const px = qr ? Math.max(1, Math.floor(TARGET_PX / total)) * total : TARGET_PX;

  return (
    <View
      style={{
        flexGrow: 1,
        borderRadius: radii.card,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        padding: space.xl,
      }}
    >
      <Text variant="headline" align="center">
        {expired ? 'This code has run out' : 'Scan with your other phone'}
      </Text>
      {qr && !expired ? (
        <View accessible accessibilityRole="image" accessibilityLabel="QR code that pairs your second phone" style={{ width: px, height: px }}>
          <Svg width={px} height={px} viewBox={`${-QUIET} ${-QUIET} ${total} ${total}`}>
            <Rect x={-QUIET} y={-QUIET} width={total} height={total} fill={colors.white} />
            <Path d={qr.d} fill="#000000" />
          </Svg>
        </View>
      ) : null}
      <Text variant="callout" muted align="center" style={{ maxWidth: 320 }}>
        {expired
          ? 'Codes work once, for 10 minutes. Show a new one and scan it with the other phone.'
          : qr
            ? 'Open the Camera on the other iPhone and point it here. That phone needs no sign-in.'
            : 'Making a code…'}
      </Text>
      {expired ? <PillButton label="Show a new code" icon="refresh" onPress={onRenew} /> : null}
    </View>
  );
}
