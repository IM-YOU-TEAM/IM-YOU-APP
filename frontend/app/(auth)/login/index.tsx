import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type TextInputInstance } from 'react-native';
import { GlassCard, Logo, PillButton, ScreenContainer, Text } from '@/components';
import {
  chooseRole,
  getEnabledProviders,
  isValidLogin,
  MIN_PASSWORD,
  signIn,
  signInWithProvider,
  signUpClinician,
  type ProviderFlags,
  type Role,
  type SocialProvider,
} from '@/features/auth/auth';
import { AuthField } from '@/features/auth/AuthField';
import { friendlyError } from '@/features/auth/errors';
import { Notice, type NoticeMessage } from '@/features/auth/Notice';
import { SocialButton } from '@/features/auth/SocialButton';
import { colors, MIN_HIT, radii, space } from '@/lib/theme';

type Mode = 'signIn' | 'signUp';

const PROVIDERS: SocialProvider[] = ['apple', 'google', 'azure'];

const SIGN_IN_TITLES: Record<Role, string> = {
  patient: 'Patient sign in',
  clinician: 'Clinical sign in',
};

function RoleChoice({ onPick }: { onPick: (role: Role) => void }) {
  return (
    <View style={styles.choice}>
      <Logo size={56} />

      <View style={styles.choiceButtons}>
        <PillButton label="Continue as patient" icon="walk" size="lg" fullWidth onPress={() => onPick('patient')} />
        <PillButton
          label="Clinical portal"
          icon="people"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => onPick('clinician')}
          accessibilityLabel="Clinical portal for clinicians, researchers, and organizations"
        />
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const compact = useWindowDimensions().width < 420;
  const [role, setRole] = useState<Role | null>(null);
  const [mode, setMode] = useState<Mode>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<SocialProvider | 'password' | null>(null);
  const [notice, setNotice] = useState<NoticeMessage | null>(null);
  const [enabled, setEnabled] = useState<ProviderFlags | null>(null);
  const loginRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    let alive = true;
    getEnabledProviders().then((flags) => {
      if (alive) setEnabled(flags);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Only providers switched on in Supabase get a button, and only for professionals: a patient's login
  // is made by their clinician, so a patient signing up with Google would have no patient record to open.
  const providers = role === 'clinician' ? PROVIDERS.filter((provider) => enabled?.[provider]) : [];
  // Patients never sign up themselves: their clinician creates their login.
  const signingUp = mode === 'signUp' && role === 'clinician';

  const pickRole = (next: Role) => {
    chooseRole(next);
    setRole(next);
    setNotice(null);
  };

  const backToRoles = () => {
    setRole(null);
    setMode('signIn');
    setNotice(null);
  };

  const continueWith = async (provider: SocialProvider) => {
    setNotice(null);
    setBusy(provider);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    if (signingUp && !displayName.trim()) {
      setNotice({ tone: 'error', text: 'Enter the name your patients will see.' });
      return;
    }
    if (!isValidLogin(login)) {
      setNotice({ tone: 'error', text: 'Enter your username or email.' });
      return;
    }
    if (signingUp && password.length < MIN_PASSWORD) {
      setNotice({ tone: 'error', text: `Use at least ${MIN_PASSWORD} characters for your password.` });
      return;
    }
    if (!password) {
      setNotice({ tone: 'error', text: 'Enter your password.' });
      return;
    }

    setNotice(null);
    setBusy('password');
    try {
      if (signingUp) await signUpClinician({ login, password, displayName });
      else await signIn(login, password);
    } catch (error) {
      setNotice({ tone: 'error', text: friendlyError(error) });
    } finally {
      setBusy(null);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'));
    setNotice(null);
  };

  return (
    <ScreenContainer
      maxWidth={560}
      gap={space.xl}
      showTopography={false}
      contentStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <GlassCard
        padding={compact ? space.xl : space.xxl}
        radius={radii.lg}
        intensity={55}
        style={{ width: '100%', maxWidth: role ? 440 : 480 }}
      >
        {role === null ? (
          <RoleChoice onPick={pickRole} />
        ) : (
          <View style={styles.stack}>
            <PillButton
              label="Back"
              icon="chevron-back"
              variant="ghost"
              onPress={backToRoles}
              disabled={busy !== null}
              style={styles.back}
            />

            <View style={styles.brand}>
              <Logo size={52} />
              <Text variant="title" align="center" accessibilityRole="header">
                {signingUp ? 'Create a clinical account' : SIGN_IN_TITLES[role]}
              </Text>
            </View>

            {providers.length > 0 ? (
              <>
                <View style={styles.group}>
                  {providers.map((provider) => (
                    <SocialButton
                      key={provider}
                      provider={provider}
                      onPress={continueWith}
                      busy={busy === provider}
                      disabled={busy !== null && busy !== provider}
                    />
                  ))}
                </View>

                <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <View style={styles.rule} />
                  <Text variant="caption" muted>
                    or use your username
                  </Text>
                  <View style={styles.rule} />
                </View>
              </>
            ) : null}

            <View style={styles.group}>
              {signingUp ? (
                <AuthField
                  label="Name patients see"
                  placeholder="Name patients see, e.g. Dr. Rivera"
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  maxLength={80}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => loginRef.current?.focus()}
                />
              ) : null}
              <AuthField
                ref={loginRef}
                label="Username or email"
                placeholder="Username or email"
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <AuthField
                ref={passwordRef}
                label="Password"
                placeholder={signingUp ? `Password, ${MIN_PASSWORD}+ characters` : 'Password'}
                value={password}
                onChangeText={setPassword}
                secure
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={signingUp ? 'new-password' : 'current-password'}
                textContentType={signingUp ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {notice ? <Notice {...notice} /> : null}
              <PillButton
                label={busy === 'password' ? (signingUp ? 'Creating account…' : 'Signing in…') : signingUp ? 'Create account' : 'Sign in'}
                size="lg"
                fullWidth
                disabled={busy !== null}
                onPress={submit}
                style={{ marginTop: space.xs }}
              />
            </View>

            {role === 'clinician' ? (
              <Pressable
                onPress={switchMode}
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => [styles.switch, pressed && { opacity: 0.6 }]}
              >
                <Text variant="callout" muted align="center">
                  {signingUp ? 'Already have an account? ' : "New to I'M YOU? "}
                  <Text variant="callout" weight={600} color={colors.seagrass}>
                    {signingUp ? 'Sign in' : 'Create an account'}
                  </Text>
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </GlassCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  choice: { width: '100%', alignItems: 'center', gap: space.xxl },
  choiceButtons: { width: '100%', gap: space.md },
  stack: { width: '100%', gap: space.xl },
  back: { alignSelf: 'flex-start', marginLeft: -space.md, marginTop: -space.md, marginBottom: -space.md },
  brand: { alignItems: 'center', gap: space.md, paddingBottom: space.xs },
  group: { width: '100%', gap: space.sm + 2 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  switch: { minHeight: MIN_HIT, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: space.md },
});
