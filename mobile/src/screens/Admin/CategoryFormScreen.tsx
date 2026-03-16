import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Category } from '../../types';

type Props = {
  token: string;
  categoryId?: string;
  onDone: () => void;
};

export default function AdminCategoryFormScreen({ token, categoryId, onDone }: Props) {
  const isEdit = !!categoryId;
  const title = useMemo(() => (isEdit ? 'Edit Kategori' : 'Tambah Kategori'), [isEdit]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!categoryId) return;
    const cats = await apiRequest<Category[]>('/api/mobile/categories', { token });
    const c = cats.find((x) => x._id === categoryId);
    if (c) {
      setName(c.name);
      setDescription(c.description || '');
    }
  }, [token, categoryId]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat kategori');
      }
    })();
  }, [load]);

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Validasi', 'Nama kategori wajib');
      return;
    }
    setLoading(true);
    try {
      if (isEdit && categoryId) {
        await apiRequest(`/api/mobile/categories/${categoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
          token,
        });
      } else {
        await apiRequest(`/api/mobile/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
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
    if (!categoryId) return;
    setLoading(true);
    try {
      await apiRequest(`/api/mobile/categories/${categoryId}`, { method: 'DELETE', token });
      Alert.alert('Berhasil', 'Kategori dihapus');
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
        <TextInput value={name} onChangeText={setName} style={styles.input} />
        <Text style={styles.label}>Deskripsi</Text>
        <TextInput value={description} onChangeText={setDescription} style={[styles.input, { height: 90 }]} multiline />
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
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff', textAlignVertical: 'top' },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  dangerButton: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.06)' },
  dangerText: { color: '#ef4444', fontWeight: '900' },
});

