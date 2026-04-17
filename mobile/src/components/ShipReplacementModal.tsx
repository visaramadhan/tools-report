import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../api/client';
import { Tool } from '../types';

type Props = {
  token: string;
  visible: boolean;
  onClose: () => void;
  replacementId: string;
  subCategory: string;
  oldToolLabel: string;
  requesterLabel: string;
  onSuccess?: () => Promise<void> | void;
};

export default function ShipReplacementModal({
  token,
  visible,
  onClose,
  replacementId,
  subCategory,
  oldToolLabel,
  requesterLabel,
  onSuccess,
}: Props) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loadingTools, setLoadingTools] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTools = useCallback(async () => {
    setLoadingTools(true);
    try {
      const q = search.trim();
      const url = q ? `/api/mobile/tools?available=true&search=${encodeURIComponent(q)}` : '/api/mobile/tools?available=true';
      const data = await apiRequest<Tool[]>(url, { token });
      const sub = String(subCategory || '');
      setTools(data.filter((t) => String(t.subCategory || '') === sub));
    } finally {
      setLoadingTools(false);
    }
  }, [search, subCategory, token]);

  useEffect(() => {
    if (!visible) return;
    setSearch('');
    setSelectedToolId('');
    setNote('');
    setPhoto(null);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    loadTools().catch(() => undefined);
  }, [loadTools, visible]);

  const selectedTool = useMemo(() => tools.find((t) => t._id === selectedToolId), [selectedToolId, tools]);

  const pickPhoto = useCallback(async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) setPhoto(res.assets[0]);
  }, []);

  const submit = useCallback(async () => {
    if (!selectedToolId) {
      Alert.alert('Validasi', 'Pilih tools pengganti');
      return;
    }
    if (!note.trim()) {
      Alert.alert('Validasi', 'Keterangan/No. Resi wajib diisi');
      return;
    }
    if (!photo?.uri) {
      Alert.alert('Validasi', 'Foto barang yang akan dikirim wajib diambil');
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('status', 'Shipped');
      fd.append('newToolId', selectedToolId);
      fd.append('note', note.trim());

      if (Platform.OS === 'web') {
        const name = photo.fileName || `ship-${Date.now()}.jpg`;
        const directFile = (photo as any)?.file as File | undefined;
        let file: File;
        if (directFile instanceof File) {
          file = new File([directFile], directFile.name || name, { type: directFile.type || photo.mimeType || 'image/jpeg' });
        } else {
          const fetched = await fetch(photo.uri);
          const blob = await fetched.blob();
          file = new File([blob], name, { type: blob.type || photo.mimeType || 'image/jpeg' });
        }
        fd.append('shipPhoto', file as any);
      } else {
        fd.append('shipPhoto', {
          uri: photo.uri,
          name: photo.fileName || `ship-${Date.now()}.jpg`,
          type: photo.mimeType || 'image/jpeg',
        } as any);
      }

      await apiRequest(`/api/mobile/replacements/${replacementId}`, { method: 'PUT', token, body: fd });
      try {
        await onSuccess?.();
      } catch {}
      Alert.alert('Berhasil', 'Tools pengganti berhasil dikirim');
      onClose();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal mengirim tools pengganti');
    } finally {
      setSubmitting(false);
    }
  }, [note, onClose, onSuccess, photo, replacementId, selectedToolId, submitting, token]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => (!submitting ? onClose() : null)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Kirim Tools Pengganti</Text>
          <Text style={styles.meta}>Tools Lama: {oldToolLabel}</Text>
          <Text style={styles.meta}>Pemakai: {requesterLabel}</Text>
          <Text style={styles.meta}>Sub Kategori: {subCategory || '-'}</Text>

          <Text style={styles.label}>Cari Tools Pengganti</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari kode / nama tools..."
            style={styles.input}
            editable={!submitting}
            onSubmitEditing={() => loadTools().catch(() => undefined)}
          />
          <Pressable style={[styles.secondaryBtn, submitting && styles.disabled]} onPress={() => loadTools().catch(() => undefined)} disabled={submitting}>
            <Text style={styles.secondaryText}>{loadingTools ? 'Loading...' : 'Refresh List'}</Text>
          </Pressable>

          <Text style={styles.label}>Pilih Tools (Sub Kategori Sama)</Text>
          <FlatList
            data={tools}
            keyExtractor={(i) => i._id}
            style={{ maxHeight: 200 }}
            ListEmptyComponent={loadingTools ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada tools tersedia</Text>}
            renderItem={({ item }) => {
              const active = selectedToolId === item._id;
              return (
                <Pressable style={[styles.toolRow, active && styles.toolRowActive]} onPress={() => setSelectedToolId(item._id)} disabled={submitting}>
                  <Text style={[styles.toolText, active && styles.toolTextActive]} numberOfLines={1}>
                    {item.toolCode} - {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
          {selectedTool ? <Text style={styles.muted}>Dipilih: {selectedTool.toolCode} - {selectedTool.name}</Text> : null}

          <Text style={styles.label}>Keterangan / No. Resi</Text>
          <TextInput value={note} onChangeText={setNote} placeholder="Contoh: Resi JNE 123..." style={styles.input} editable={!submitting} />

          <Text style={styles.label}>Foto Barang yang Akan Dikirim</Text>
          <Pressable style={[styles.photoBtn, submitting && styles.disabled]} onPress={pickPhoto} disabled={submitting}>
            <Text style={styles.photoText}>{photo ? 'Ganti Foto' : 'Ambil Foto'}</Text>
          </Pressable>
          {photo?.uri ? <Image source={{ uri: photo.uri }} style={styles.photoPreview} /> : null}

          <View style={styles.actions}>
            <Pressable style={[styles.cancelBtn, submitting && styles.disabled]} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Batal</Text>
            </Pressable>
            <Pressable style={[styles.submitBtn, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
              <Text style={styles.submitText}>{submitting ? 'Mengirim...' : 'Kirim'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, maxHeight: '90%' },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  meta: { marginTop: 6, color: '#6b7280', fontWeight: '700' },
  label: { marginTop: 14, marginBottom: 8, color: '#6b7280', fontSize: 12, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  secondaryBtn: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: '#0E5E7E', fontWeight: '900' },
  toolRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', marginTop: 8 },
  toolRowActive: { borderColor: 'rgba(22,163,74,0.5)', backgroundColor: 'rgba(34,197,94,0.10)' },
  toolText: { color: '#111827', fontWeight: '800' },
  toolTextActive: { color: '#16a34a' },
  muted: { marginTop: 8, color: '#6b7280' },
  photoBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  photoText: { color: '#fff', fontWeight: '900' },
  photoPreview: { marginTop: 10, width: '100%', height: 150, borderRadius: 12, backgroundColor: 'rgba(42,53,71,0.06)' },
  actions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { color: '#111827', fontWeight: '900' },
  submitBtn: { flex: 2, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.7 },
});

