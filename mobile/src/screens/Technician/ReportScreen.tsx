import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Tool } from '../../types';

type Props = {
  token: string;
  initialTool?: Tool;
  onDone: () => void;
};

export default function ReportScreen({ token, initialTool, onDone }: Props) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState(initialTool?._id || '');
  const [condition, setCondition] = useState<'Good' | 'Bad'>('Good');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const t = await apiRequest<Tool[]>('/api/mobile/tools/mine', { token });
        setTools(t);
        if (!toolId && t.length > 0) setToolId(t[0]._id);
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat tools');
      }
    })();
  }, [token]);

  const selectedTool = useMemo(() => tools.find((t) => t._id === toolId), [tools, toolId]);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin', 'Izin galeri diperlukan untuk upload foto');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0]);
  };

  const submit = async () => {
    if (!toolId) {
      Alert.alert('Validasi', 'Pilih tools dulu');
      return;
    }
    if (condition === 'Bad') {
      if (!description.trim()) {
        Alert.alert('Validasi', 'Keterangan wajib diisi jika kondisi rusak');
        return;
      }
      if (!photo) {
        Alert.alert('Validasi', 'Foto wajib diupload jika kondisi rusak');
        return;
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('toolId', toolId);
      fd.append('condition', condition);
      fd.append('description', description);
      if (photo && photo.uri) {
        const name = photo.fileName || `report-${Date.now()}.jpg`;
        const type = photo.mimeType || 'image/jpeg';
        fd.append('photo', { uri: photo.uri, name, type } as any);
      }

      await apiRequest('/api/mobile/reports', { method: 'POST', body: fd, token });
      Alert.alert('Berhasil', 'Report terkirim');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal mengirim report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Buat Report</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Tools</Text>
        <View style={styles.select}>
          <Text style={styles.selectText}>
            {selectedTool ? `${selectedTool.toolCode} - ${selectedTool.name}` : '-- Pilih Tools --'}
          </Text>
        </View>
        <View style={styles.toolList}>
          {tools.map((t) => (
            <Pressable key={t._id} onPress={() => setToolId(t._id)} style={[styles.toolItem, toolId === t._id && styles.toolItemActive]}>
              <Text style={styles.toolCode}>{t.toolCode}</Text>
              <Text style={styles.toolName}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Kondisi</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setCondition('Good')} style={[styles.pill, condition === 'Good' && styles.pillActive]}>
            <Text style={[styles.pillText, condition === 'Good' && styles.pillTextActive]}>Good</Text>
          </Pressable>
          <Pressable onPress={() => setCondition('Bad')} style={[styles.pill, condition === 'Bad' && styles.pillActive]}>
            <Text style={[styles.pillText, condition === 'Bad' && styles.pillTextActive]}>Bad</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Keterangan</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tulis keterangan..."
          style={[styles.input, { height: 90 }]}
          multiline
        />

        <View style={{ marginTop: 12 }}>
          <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
            <Text style={styles.secondaryText}>{photo ? 'Ganti Foto' : 'Pilih Foto'}</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Mengirim...' : 'Kirim Report'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#2A3547', marginTop: 6, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  label: { fontWeight: '800', color: '#374151' },
  select: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12 },
  selectText: { color: '#111827', fontWeight: '700' },
  toolList: { marginTop: 10, gap: 8 },
  toolItem: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toolItemActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  toolCode: { fontFamily: 'monospace', backgroundColor: 'rgba(42,53,71,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontWeight: '800', color: '#2A3547' },
  toolName: { flex: 1, fontWeight: '700', color: '#111827' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  pill: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { color: '#374151', fontWeight: '800' },
  pillTextActive: { color: '#0E5E7E' },
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, textAlignVertical: 'top' },
  secondaryButton: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  secondaryText: { fontWeight: '800', color: '#0E5E7E' },
  button: { marginTop: 14, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '800' },
});

