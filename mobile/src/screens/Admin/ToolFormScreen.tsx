import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Category, SubCategory, Tool } from '../../types';

type Props = {
  token: string;
  toolId?: string;
  onDone: () => void;
};

type FormState = {
  category: string;
  subCategory: string;
  year: string;
  description: string;
  condition: 'Good' | 'Bad';
  status: boolean;
  isSingleUse: boolean;
  isSpecial: boolean;
};

export default function AdminToolFormScreen({ token, toolId, onDone }: Props) {
  const isEdit = !!toolId;
  const [tool, setTool] = useState<Tool | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<FormState>({
    category: '',
    subCategory: '',
    year: String(new Date().getFullYear()),
    description: '',
    condition: 'Good',
    status: true,
    isSingleUse: false,
    isSpecial: false,
  });

  const title = useMemo(() => (isEdit ? 'Edit Tools' : 'Tambah Tools'), [isEdit]);

  const loadCategories = useCallback(async () => {
    const data = await apiRequest<Category[]>('/api/mobile/categories', { token });
    setCategories(data);
  }, [token]);

  const loadSubCategories = useCallback(
    async (categoryName: string) => {
      if (!categoryName) {
        setSubCategories([]);
        return;
      }
      const data = await apiRequest<SubCategory[]>(`/api/mobile/subcategories?categoryName=${encodeURIComponent(categoryName)}`, { token });
      setSubCategories(data);
      if (data.length > 0 && !data.some((x) => x.name === state.subCategory)) {
        setState((p) => ({ ...p, subCategory: data[0].name }));
      }
    },
    [token, state.subCategory]
  );

  const loadTool = useCallback(async () => {
    if (!toolId) return;
    const t = await apiRequest<Tool>(`/api/mobile/tools/${toolId}`, { token });
    setTool(t);
    setState({
      category: t.category,
      subCategory: t.subCategory,
      year: String(t.year || new Date().getFullYear()),
      description: t.description || '',
      condition: (t.condition as 'Good' | 'Bad') || 'Good',
      status: t.status ?? true,
      isSingleUse: t.isSingleUse ?? false,
      isSpecial: t.isSpecial ?? false,
    });
  }, [token, toolId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadCategories();
        if (toolId) await loadTool();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadCategories, loadTool, toolId]);

  useEffect(() => {
    (async () => {
      try {
        await loadSubCategories(state.category);
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat sub kategori');
      }
    })();
  }, [state.category, loadSubCategories]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin', 'Izin galeri diperlukan');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0]);
  };

  const submit = async () => {
    if (!state.category || !state.subCategory || !state.year) {
      Alert.alert('Validasi', 'Kategori, sub kategori, dan tahun wajib diisi');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('category', state.category);
      fd.append('subCategory', state.subCategory);
      fd.append('year', state.year);
      fd.append('description', state.description);
      fd.append('condition', state.condition);
      fd.append('status', state.status ? 'true' : 'false');
      fd.append('isSingleUse', state.isSingleUse ? 'true' : 'false');
      fd.append('isSpecial', state.isSpecial ? 'true' : 'false');
      if (photo?.uri) {
        const name = photo.fileName || `tool-${Date.now()}.jpg`;
        const type = photo.mimeType || 'image/jpeg';
        fd.append('photo', { uri: photo.uri, name, type } as any);
      }

      if (isEdit && toolId) {
        await apiRequest(`/api/mobile/tools/${toolId}`, { method: 'PUT', body: fd, token });
      } else {
        await apiRequest(`/api/mobile/tools`, { method: 'POST', body: fd, token });
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
    if (!toolId) return;
    setLoading(true);
    try {
      await apiRequest(`/api/mobile/tools/${toolId}`, { method: 'DELETE', token });
      Alert.alert('Berhasil', 'Tools dihapus');
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
        {tool?.toolCode ? <Text style={styles.meta}>Tool Code: {tool.toolCode}</Text> : null}

        <Text style={styles.label}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {categories.map((c) => (
            <Pressable
              key={c._id}
              onPress={() => setState((p) => ({ ...p, category: c.name }))}
              style={[styles.pill, state.category === c.name && styles.pillActive]}
            >
              <Text style={[styles.pillText, state.category === c.name && styles.pillTextActive]}>{c.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Sub Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {subCategories.map((s) => (
            <Pressable
              key={s._id}
              onPress={() => setState((p) => ({ ...p, subCategory: s.name }))}
              style={[styles.pill, state.subCategory === s.name && styles.pillActive]}
            >
              <Text style={[styles.pillText, state.subCategory === s.name && styles.pillTextActive]}>
                {s.name} ({s.prefix})
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.label}>Tahun</Text>
        <TextInput value={state.year} onChangeText={(v) => setState((p) => ({ ...p, year: v }))} keyboardType="number-pad" style={styles.input} />

        <Text style={styles.label}>Kondisi</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setState((p) => ({ ...p, condition: 'Good' }))} style={[styles.pillWide, state.condition === 'Good' && styles.pillActive]}>
            <Text style={[styles.pillText, state.condition === 'Good' && styles.pillTextActive]}>Good</Text>
          </Pressable>
          <Pressable onPress={() => setState((p) => ({ ...p, condition: 'Bad' }))} style={[styles.pillWide, state.condition === 'Bad' && styles.pillActive]}>
            <Text style={[styles.pillText, state.condition === 'Bad' && styles.pillTextActive]}>Bad</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setState((p) => ({ ...p, status: true }))} style={[styles.pillWide, state.status && styles.pillActive]}>
            <Text style={[styles.pillText, state.status && styles.pillTextActive]}>Active</Text>
          </Pressable>
          <Pressable onPress={() => setState((p) => ({ ...p, status: false }))} style={[styles.pillWide, !state.status && styles.pillActive]}>
            <Text style={[styles.pillText, !state.status && styles.pillTextActive]}>Inactive</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Tools Sekali Pakai</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setState((p) => ({ ...p, isSingleUse: true }))} style={[styles.pillWide, state.isSingleUse && styles.pillActive]}>
            <Text style={[styles.pillText, state.isSingleUse && styles.pillTextActive]}>Ya</Text>
          </Pressable>
          <Pressable onPress={() => setState((p) => ({ ...p, isSingleUse: false }))} style={[styles.pillWide, !state.isSingleUse && styles.pillActive]}>
            <Text style={[styles.pillText, !state.isSingleUse && styles.pillTextActive]}>Tidak</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Tools Spesial</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setState((p) => ({ ...p, isSpecial: true }))} style={[styles.pillWide, state.isSpecial && styles.pillActive]}>
            <Text style={[styles.pillText, state.isSpecial && styles.pillTextActive]}>Ya</Text>
          </Pressable>
          <Pressable onPress={() => setState((p) => ({ ...p, isSpecial: false }))} style={[styles.pillWide, !state.isSpecial && styles.pillActive]}>
            <Text style={[styles.pillText, !state.isSpecial && styles.pillTextActive]}>Tidak</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Deskripsi</Text>
        <TextInput value={state.description} onChangeText={(v) => setState((p) => ({ ...p, description: v }))} style={[styles.input, { height: 90 }]} multiline />

        <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
          <Text style={styles.secondaryText}>{photo ? 'Ganti Foto' : 'Pilih Foto'}</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
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
  meta: { marginTop: 8, color: '#6b7280' },
  label: { marginTop: 12, fontWeight: '900', color: '#374151' },
  sectionLabel: { marginTop: 16, fontWeight: '900', color: '#111827' },
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff', textAlignVertical: 'top' },
  pills: { gap: 8, paddingVertical: 10 },
  pill: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  pillWide: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryButton: { marginTop: 12, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { fontWeight: '900', color: '#0E5E7E' },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  dangerButton: { borderWidth: 1, borderColor: 'rgba(239,68,68,0.45)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.06)' },
  dangerText: { color: '#ef4444', fontWeight: '900' },
});
