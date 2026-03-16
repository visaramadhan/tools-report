import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { API_BASE_URL, apiRequest } from '../api/client';
import { User } from '../types';

type Props = {
  onLoggedIn: (token: string, user: User) => void;
};

export default function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validasi', 'Email dan password wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ token: string; user: User }>('/api/mobile/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      onLoggedIn(res.token, res.user);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Tools Report</Text>
        <Text style={styles.subtitle}>Masuk ke akun anda</Text>
        <Text style={styles.baseUrl}>{API_BASE_URL}</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Masuk'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', justifyContent: 'center', padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, shadowColor: '#0A3E55', shadowOpacity: 0.12, shadowRadius: 14, elevation: 3 },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 90, height: 90 },
  title: { fontSize: 22, fontWeight: '700', color: '#2A3547' },
  subtitle: { marginTop: 6, color: '#6b7280' },
  baseUrl: { marginTop: 8, color: '#9ca3af', fontSize: 12 },
  input: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff' },
  button: { marginTop: 16, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
