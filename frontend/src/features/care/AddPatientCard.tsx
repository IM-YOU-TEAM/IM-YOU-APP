import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { View, type TextInputInstance } from 'react-native';
import { Card, PillButton, Text } from '@/components';
import { isValidLogin, MIN_PASSWORD } from '@/features/auth/auth';
import { AuthField } from '@/features/auth/AuthField';
import { friendlyError } from '@/features/auth/errors';
import { Notice } from '@/features/auth/Notice';
import { colors, space } from '@/lib/theme';
import { addPatient } from './api';

type Handover = { fullName: string; login: string; password: string };

function Credential({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="caption" muted>
        {label}
      </Text>
      <Text selectable variant="title" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
}

/** Name the patient and set their login. The clinician hands the username and password over in person. */
export function AddPatientCard({ onAdded, onClose }: { onAdded: () => void; onClose: () => void }) {
  const [fullName, setFullName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handover, setHandover] = useState<Handover | null>(null);
  const loginRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  const save = async () => {
    if (!fullName.trim()) return setError("Enter the patient's name.");
    if (!isValidLogin(login)) return setError('Usernames are 3 to 24 letters or numbers, and may use . _ or -.');
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for the password.`);

    setSaving(true);
    setError(null);
    try {
      const created = { fullName: fullName.trim(), login: login.trim().toLowerCase(), password };
      await addPatient(created);
      setHandover(created);
      onAdded();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  if (handover) {
    return (
      // The screen's one Cherry Blossom highlight: the login the clinician has to pass on.
      <Card tone="accent" style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="key" size={18} color={colors.graphite} />
          </View>
          <Text variant="headline">{handover.fullName} can sign in now</Text>
        </View>
        <Credential label={handover.login.includes('@') ? 'Email' : 'Username'} value={handover.login} />
        <Credential label="Password" value={handover.password} />
        <Text variant="callout">Give these to your patient. They choose "Continue as patient" and sign in.</Text>
        <PillButton label="Done" variant="secondary" onPress={onClose} />
      </Card>
    );
  }

  return (
    <Card style={{ gap: space.md }}>
      <Text variant="headline">New patient</Text>
      <AuthField
        label="Patient's full name"
        placeholder="Full name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={80}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => loginRef.current?.focus()}
      />
      <AuthField
        ref={loginRef}
        label="Username or email for the patient"
        placeholder="Username or email"
        value={login}
        onChangeText={setLogin}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <AuthField
        ref={passwordRef}
        label="Password for the patient"
        placeholder={`Password, ${MIN_PASSWORD}+ characters`}
        value={password}
        onChangeText={setPassword}
        secure
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={save}
      />
      {error ? <Notice tone="error" text={error} /> : null}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <PillButton label="Cancel" variant="secondary" disabled={saving} onPress={onClose} style={{ flex: 1 }} />
        <PillButton label={saving ? 'Adding…' : 'Add patient'} disabled={saving} onPress={save} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}
