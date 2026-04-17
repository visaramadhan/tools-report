import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { apiRequest } from '../api/client';
import { useAppTheme } from '../theme';

type Props = {
  token: string;
  onLogout: () => void;
};

export default function SettingsScreen({ token, onLogout }: Props) {
  const [emailManagement, setEmailManagement] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { colors, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>('/api/mobile/settings', { token });
      if (data?.emailManagement) {
        setEmailManagement(data.emailManagement);
      }
    } catch (e: any) {
      console.error('Failed to load settings', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    if (!emailManagement.trim()) {
      Alert.alert('Validasi', 'Email manajemen tidak boleh kosong');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/api/mobile/settings', {
        method: 'POST',
        token,
        body: JSON.stringify({ emailManagement: emailManagement.trim() }),
      });
      Alert.alert('Berhasil', 'Pengaturan berhasil disimpan');
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Pengaturan Sistem</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Mode Malam</Text>
          <Text style={styles.subLabel}>Pilih mode tampilan: mengikuti sistem, terang, atau malam.</Text>
          <View style={styles.row}>
            <Pressable style={[styles.pill, mode === 'system' && styles.pillActive]} onPress={() => setMode('system')}>
              <Text style={[styles.pillText, mode === 'system' && styles.pillTextActive]}>System</Text>
            </Pressable>
            <Pressable style={[styles.pill, mode === 'light' && styles.pillActive]} onPress={() => setMode('light')}>
              <Text style={[styles.pillText, mode === 'light' && styles.pillTextActive]}>Terang</Text>
            </Pressable>
            <Pressable style={[styles.pill, mode === 'dark' && styles.pillActive]} onPress={() => setMode('dark')}>
              <Text style={[styles.pillText, mode === 'dark' && styles.pillTextActive]}>Malam</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Email Manajemen</Text>
          <Text style={styles.subLabel}>Email ini akan menerima laporan kondisi tools dari teknisi dan admin.</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 10 }} />
          ) : (
            <TextInput
              value={emailManagement}
              onChangeText={setEmailManagement}
              placeholder="management@example.com"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.muted}
            />
          )}
          
          <Pressable 
            style={[styles.saveButton, saving && styles.buttonDisabled]} 
            onPress={saveSettings}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Simpan Pengaturan</Text>
            )}
          </Pressable>
        </View>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.title}>Akun</Text>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.buttonText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 18, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 14 },
    section: { marginTop: 4 },
    label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
    subLabel: { fontSize: 12, color: colors.muted, marginBottom: 10, lineHeight: 18 },
    row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.card },
    pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    pillText: { fontWeight: '900', color: colors.text },
    pillTextActive: { color: '#fff' },
    input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.inputBg, fontSize: 14, color: colors.text, marginBottom: 14 },
    saveButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    saveButtonText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    logoutButton: { backgroundColor: colors.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '800' },
    buttonDisabled: { opacity: 0.7 },
  });

