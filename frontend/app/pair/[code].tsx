import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Card, PillButton, ScreenContainer, Text } from '@/components';
import { SITE_LABELS, type Site } from '@/features/capture/imu/protocol';
import { TwoPhonePlacement } from '@/features/capture/imu/TwoPhonePlacement';
import { useSecondPhone, type SecondPhoneGate } from '@/features/capture/imu/useSecondPhone';
import { RecordingBadge } from '@/features/capture/RecordingBadge';
import { formatDuration } from '@/lib/format';
import { space } from '@/lib/theme';

// The second phone of a sensor session, opened by scanning the QR code on the signed-in phone. No account.
export default function PairScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <SecondPhone code={typeof code === 'string' ? code : ''} />;
}

function SecondPhone({ code }: { code: string }) {
  const phone = useSecondPhone(code);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!phone.recording || phone.paused) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phone.recording, phone.paused]);

  const status = phone.recording ? (phone.paused ? 'paused' : 'recording') : 'setting-up';
  const showClock = phone.recording || phone.done;

  return (
    <ScreenContainer maxWidth={560} gap={space.xl}>
      <View style={{ gap: space.sm }}>
        <Text variant="display">Second phone</Text>
        <Text muted>{phone.mySite ? `Goes on your ${SITE_LABELS[phone.mySite].toLowerCase()}` : 'Paired by QR code, no sign-in'}</Text>
      </View>
      {phone.done ? null : <RecordingBadge status={status} />}

      <Card style={{ gap: space.xl }}>
        {showClock ? (
          <View
            accessible
            accessibilityLabel={`Elapsed time ${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds`}
            style={{ alignItems: 'center' }}
          >
            <Text variant="display" align="center" style={{ fontSize: 64, lineHeight: 72, letterSpacing: -1.5, fontVariant: ['tabular-nums'] }}>
              {formatDuration(seconds)}
            </Text>
          </View>
        ) : (
          <View style={{ height: 220 }}>
            <TwoPhonePlacement />
          </View>
        )}
        <Text variant="callout" muted align="center" accessibilityLiveRegion="polite">
          {secondPhonePrompt(phone.gate, phone)}
        </Text>
        {phone.gate === 'need-permission' && !phone.done ? (
          <PillButton label="Allow motion sensors" icon="phone-portrait" size="lg" fullWidth onPress={() => void phone.requestSensors()} />
        ) : null}
        {phone.gate === 'unreachable' && !phone.done ? (
          <PillButton label="Try again" icon="refresh" size="lg" fullWidth onPress={phone.retry} />
        ) : null}
      </Card>
    </ScreenContainer>
  );
}

function secondPhonePrompt(
  gate: SecondPhoneGate,
  phone: { done: boolean; recording: boolean; paused: boolean; mySite: Site | null; motionDenied: boolean },
): string {
  if (phone.done) return 'All done. Your other phone saved this session, so you can close this page.';
  if (phone.paused) return 'Paused from your other phone.';
  if (phone.recording) {
    return gate === 'ready' ? 'Recording. Keep this page open with the screen on.' : 'Lost touch with your other phone. Keep this page open.';
  }
  switch (gate) {
    case 'claiming':
      return 'Pairing with your other phone…';
    case 'invalid-code':
      return 'This code was already used or has run out. Scan the new code showing on your signed-in phone.';
    case 'unreachable':
      return 'Could not reach your other phone. Check the network, then try again.';
    case 'connecting':
      return 'Connecting to your other phone…';
    case 'unavailable-sensors':
      return 'Open this link in Safari on an iPhone. This browser cannot read motion sensors.';
    case 'need-permission':
      return phone.motionDenied
        ? 'Safari blocked motion access. Reload this page and tap Allow when it asks.'
        : 'Tap Allow motion sensors, then choose Allow when Safari asks.';
    case 'waiting-for-first-phone':
      return 'Waiting for your signed-in phone. Keep it on the session screen. If it shows a new code, scan that one instead.';
    case 'syncing-clocks':
      return 'Lining up this phone’s clock with your other phone…';
    case 'ready':
      return `Strap this phone to your ${phone.mySite ? SITE_LABELS[phone.mySite].toLowerCase() : 'leg'}. Recording starts and stops from your other phone.`;
    default: {
      const unexpected: never = gate;
      return unexpected;
    }
  }
}
