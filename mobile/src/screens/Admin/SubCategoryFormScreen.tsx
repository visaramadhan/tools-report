import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Category, SubCategory } from '../../types';

type Props = {
  token: string;
  subCategoryId?: string;
  onDone: () => void;
};

export default function AdminSubCategoryFormScreen({ token, subCategoryId, onDone }: Props) {
  const isEdit = !!subCategoryId;
  const title = useMemo(() => (isEdit ? 'Edit Sub Kategori' : 'Tambah Sub Kategori'), [isEdit]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [prefix, setPrefix] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const cats = await apiRequest<Category[]>('/api/mobile/categories', { token });
    setCategories(cats);
    if (!categoryId && cats[0]?._id) setCategoryId(cats[0]._id);

    if (subCategoryId) {
      const subs = await apiRequest<SubCategory[]>('/api/mobile/subcategories', { token });
      const sub = subs.find((s) => s._id === subCategoryId);
      if (sub) {
        setCategoryId(sub.categoryId);
        setName(sub.name);
        setPrefix(sub.prefix);
        setDescription(sub.description || '');
      }
    }
  }, [token, subCategoryId, categoryId]);

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      }
    })();
  }, [load]);

  const save = async () => {
    if (!name.trim() || !prefix.trim() || !categoryId) {
      Alert.alert('Validasi', 'Nama, prefix, dan kategori wajib');
      return;
    }
    setLoading(true);
    try {
      const payload = { name, prefix, categoryId, description };
      if (isEdit && subCategoryId) {
        await apiRequest(`/api/mobile/subcategories/${subCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          token,
        });
      } else {
        await apiRequest(`/api/mobile/subcategories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
    if (!subCategoryId) return;
    setLoading(true);
    try {
      await apiRequest(`/api/mobile/subcategories/${subCategoryId}`, { method: 'DELETE', token });
      Alert.alert('Berhasil', 'Sub kategori dihapus');
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

        <Text style={styles.label}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {categories.map((c) => (
            <Pressable key={c._id} onPress={() => setCategoryId(c._id)} style={[styles.pill, categoryId === c._id && styles.pillActive]}>
              <Text style={[styles.pillText, categoryId === c._id && styles.pillTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Nama</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} />
        <Text style={styles.label}>Prefix</Text>
        <TextInput value={prefix} onChangeText={setPrefix} style={styles.input} autoCapitalize="characters" />
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
  pills: { gap: 8, paddingVertical: 10 },
  pill: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  dangerButton: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.06)' },
  dangerText: { color: '#ef4444', fontWeight: '900' },
});

