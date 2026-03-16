import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Role } from '../../types';

type Props = {
  token: string;
  userId?: string;
  onDone: () => void;
};

type FormState = {
  name: string;
  email: string;
  password: string;
  role: Role;
  status: boolean;
};

export default function AdminUserFormScreen({ token, userId, onDone }: Props) {
  const isEdit = !!userId;
  const [state, setState] = useState<FormState>({
    name: '',
    email: '',
    password: '',
    role: 'technician',
    status: true,
  });
  const [loading, setLoading] = useState(false);

  const title = useMemo(() => (isEdit ? 'Edit User' : 'Tambah User'), [isEdit]);

  const load = useCallback(async () => {
    if (!userId) return;
    const u = await apiRequest<{ _id: string; name: string; email: string; role: Role; status: boolean }>(`/api/mobile/users/${userId}`, {
      token,
    });
    setState((prev) => ({ ...prev, name: u.name, email: u.email, role: u.role, status: u.status, password: '' }));
  }, [token, userId]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat user');
      }
    })();
  }, [load]);

  const save = async () => {
    if (!state.name.trim() || !state.email.trim()) {
      Alert.alert('Validasi', 'Nama dan email wajib diisi');
      return;
    }
    if (!isEdit && !state.password.trim()) {
      Alert.alert('Validasi', 'Password wajib diisi');
      return;
    }
    setLoading(true);
    try {
      if (isEdit) {
        await apiRequest(`/api/mobile/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name,
            email: state.email,
            password: state.password.trim() ? state.password : undefined,
            role: state.role,
            status: state.status,
          }),
          token,
        });
      } else {
        await apiRequest(`/api/mobile/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: state.name,
            email: state.email,
            password: state.password,
            role: state.role,
          }),
          token,
        });
      }
      Alert.alert('Berhasil', 'Tersimpan');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menyimpan');
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await apiRequest(`/api/mobile/users/${userId}`, { method: 'DELETE', token });
      Alert.alert('Berhasil', 'User dihapus');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menghapus');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.label}>Nama</Text>
        <TextInput value={state.name} onChangeText={(v) => setState((p) => ({ ...p, name: v }))} style={styles.input} />
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={state.email}
          onChangeText={(v) => setState((p) => ({ ...p, email: v }))}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Text style={styles.label}>{isEdit ? 'Password (opsional)' : 'Password'}</Text>
        <TextInput value={state.password} onChangeText={(v) => setState((p) => ({ ...p, password: v }))} style={styles.input} secureTextEntry />

        <Text style={styles.label}>Role</Text>
        <View style={styles.row}>
          <Pressable
            onPress={() => setState((p) => ({ ...p, role: 'technician' }))}
            style={[styles.pill, state.role === 'technician' && styles.pillActive]}
          >
            <Text style={[styles.pillText, state.role === 'technician' && styles.pillTextActive]}>Technician</Text>
          </Pressable>
          <Pressable onPress={() => setState((p) => ({ ...p, role: 'admin' }))} style={[styles.pill, state.role === 'admin' && styles.pillActive]}>
            <Text style={[styles.pillText, state.role === 'admin' && styles.pillTextActive]}>Admin</Text>
          </Pressable>
        </View>

        {isEdit ? (
          <>
            <Text style={styles.label}>Status</Text>
            <View style={styles.row}>
              <Pressable onPress={() => setState((p) => ({ ...p, status: true }))} style={[styles.pill, state.status && styles.pillActive]}>
                <Text style={[styles.pillText, state.status && styles.pillTextActive]}>Active</Text>
              </Pressable>
              <Pressable onPress={() => setState((p) => ({ ...p, status: false }))} style={[styles.pill, !state.status && styles.pillActive]}>
                <Text style={[styles.pillText, !state.status && styles.pillTextActive]}>Inactive</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={save} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Proses...' : 'Simpan'}</Text>
      </Pressable>
      {isEdit ? (
        <Pressable style={[styles.dangerButton, loading && styles.buttonDisabled]} onPress={remove} disabled={loading}>
          <Text style={styles.dangerText}>Hapus</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A3547' },
  label: { marginTop: 12, fontWeight: '900', color: '#374151' },
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  dangerButton: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.06)' },
  dangerText: { color: '#ef4444', fontWeight: '900' },
});

