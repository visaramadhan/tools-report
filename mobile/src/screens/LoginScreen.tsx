import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { apiRequest, getApiBaseUrlForDisplay } from '../api/client';
import { clearApiBaseUrlOverride, setApiBaseUrlOverride } from '../storage/config';
import { User } from '../types';
import { useAppTheme } from '../theme';

type Props = {
  onLoggedIn: (token: string, user: User) => void;
};

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingBaseUrl, setEditingBaseUrl] = useState(false);
  const [baseUrlDraft, setBaseUrlDraft] = useState('');
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    (async () => {
      const url = await getApiBaseUrlForDisplay();
      setBaseUrlDraft(url);
    })();
  }, []);

  const submit = async () => {
    if (!email.trim() || !password) {
      const msg = 'Email dan password wajib diisi';
      setError(msg);
      if (Platform.OS !== 'web') Alert.alert('Validasi', msg);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/mobile/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      onLoggedIn(res.token, res.user);
    } catch (e: any) {
      const detailUrl = e?.detail?.url ? `\n${String(e.detail.url)}` : '';
      const msg = `${e?.message || 'Login gagal'}${detailUrl}`;
      setError(msg);
      if (Platform.OS !== 'web') Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const saveBaseUrl = async () => {
    const value = baseUrlDraft.trim();
    if (!value) {
      await clearApiBaseUrlOverride();
      const resolved = await getApiBaseUrlForDisplay();
      setBaseUrlDraft(resolved);
      setEditingBaseUrl(false);
      return;
    }
    await setApiBaseUrlOverride(value);
    const resolved = await getApiBaseUrlForDisplay();
    setEditingBaseUrl(false);
    Alert.alert('Berhasil', `API URL diset ke:\n${resolved}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <View style={styles.brandMark}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </View>
        </View>
        <Text style={styles.title}>Tools Report System</Text>
        <Text style={styles.subtitle}>Masuk ke akun anda</Text>
        <Pressable style={styles.linkBtn} onPress={() => setEditingBaseUrl((v) => !v)}>
          <Text style={styles.linkText}>{editingBaseUrl ? 'Tutup' : 'Ubah API URL'}</Text>
        </Pressable>
        {editingBaseUrl ? (
          <>
            <TextInput
              value={baseUrlDraft}
              onChangeText={setBaseUrlDraft}
              placeholder="https://your-backend-domain"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.muted}
            />
            <Pressable style={styles.secondaryButton} onPress={saveBaseUrl}>
              <Text style={styles.secondaryText}>Simpan API URL</Text>
            </Pressable>
          </>
        ) : null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholderTextColor={colors.muted}
        />
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            placeholderTextColor={colors.muted}
          />
          <Pressable style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
            <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} color={colors.muted} size={18} />
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Masuk'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 16 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 18, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
    logoWrap: { alignItems: 'center', marginBottom: 12 },
    brandMark: { width: 92, height: 92, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56,189,248,0.18)' },
    logo: { width: 60, height: 60 },
    title: { fontSize: 22, color: colors.text, textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
    subtitle: { marginTop: 6, color: colors.muted, textTransform: 'uppercase', fontFamily: 'Montserrat_700Bold' },
    baseUrl: { marginTop: 8, color: colors.muted, fontSize: 12 },
    linkBtn: { marginTop: 8 },
    linkText: { color: colors.primary, fontWeight: '700' },
    input: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.inputBg, color: colors.text },
    passwordRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.inputBg },
    passwordInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
    eyeBtn: { paddingHorizontal: 12, paddingVertical: 10 },
    secondaryButton: { marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.card },
    secondaryText: { fontWeight: '700', color: colors.primary },
    error: { marginTop: 10, color: colors.danger, fontWeight: '700' },
    button: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '700' },
  });
