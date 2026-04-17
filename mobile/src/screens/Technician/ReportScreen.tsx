import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Report, Tool } from '../../types';
import { useAppTheme } from '../../theme';

type Props = {
  token: string;
  initialTool?: Tool;
  onDone: () => void;
};

export default function ReportScreen({ token, initialTool, onDone }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolId, setToolId] = useState(initialTool?._id || '');
  const [condition, setCondition] = useState<'Good' | 'Bad'>('Good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusDetail, setStatusDetail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const t = await apiRequest<Tool[]>('/api/mobile/tools/mine', { token });
        setTools(t.filter((x) => (x.status !== false) && (x.condition || 'Good') !== 'Bad'));
        if (!toolId && t.length > 0) setToolId(t[0]._id);
      } catch (e: any) {
        const url = e?.detail?.url ? String(e.detail.url) : '';
        const body = e?.detail?.body ? JSON.stringify(e.detail.body) : '';
        setStatusType('error');
        setStatusTitle('Gagal');
        setStatusMessage(e?.message || 'Gagal memuat tools');
        setStatusDetail([url, body].filter(Boolean).join('\n'));
        setStatusOpen(true);
      }
    })();
  }, [token]);

  const selectedTool = useMemo(() => tools.find((t) => t._id === toolId), [tools, toolId]);

  const pickPhotos = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatusType('error');
      setStatusTitle('Izin');
      setStatusMessage('Izin galeri diperlukan untuk upload foto');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsMultipleSelection: true,
      quality: 0.7 
    });
    if (!res.canceled && res.assets) setPhotos([...photos, ...res.assets]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!toolId) {
      setStatusType('error');
      setStatusTitle('Validasi');
      setStatusMessage('Pilih tools dulu');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }
    if (condition === 'Bad') {
      if (!description.trim()) {
        setStatusType('error');
        setStatusTitle('Validasi');
        setStatusMessage('Keterangan wajib diisi jika kondisi rusak');
        setStatusDetail('');
        setStatusOpen(true);
        return;
      }
      if (photos.length === 0) {
        setStatusType('error');
        setStatusTitle('Validasi');
        setStatusMessage('Foto wajib diupload jika kondisi rusak');
        setStatusDetail('');
        setStatusOpen(true);
        return;
      }
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('toolId', toolId);
      fd.append('condition', condition);
      fd.append('description', description);
      fd.append('expectedPhotoCount', String(photos.length));
      
      if (Platform.OS === 'web') {
        for (let index = 0; index < photos.length; index++) {
          const p = photos[index];
          if (!p?.uri) continue;
          const name = p.fileName || `report-${Date.now()}-${index}.jpg`;
          const directFile = (p as any)?.file as File | undefined;
          let file: File;
          if (directFile instanceof File) {
            file = new File([directFile], directFile.name || name, { type: directFile.type || p.mimeType || 'image/jpeg' });
          } else {
            const fetched = await fetch(p.uri);
            const blob = await fetched.blob();
            const type = p.mimeType || blob.type || 'image/jpeg';
            file = new File([blob], name, { type });
          }
          if (!file.size) {
            throw new Error('File foto kosong / tidak terbaca (0 bytes)');
          }
          fd.append('photo', file);
        }
      } else {
        photos.forEach((p, index) => {
          if (p.uri) {
            const name = p.fileName || `report-${Date.now()}-${index}.jpg`;
            const type = p.mimeType || 'image/jpeg';
            // @ts-ignore
            fd.append('photo', { uri: p.uri, name, type });
          }
        });
      }

      const created = await apiRequest<Report>('/api/mobile/reports', { method: 'POST', body: fd, token });
      const returnedPhotos = (created.photoUrls && created.photoUrls.length > 0) ? created.photoUrls : (created.photoUrl ? [created.photoUrl] : []);
      if (photos.length > 0 && returnedPhotos.length === 0) {
        setStatusType('error');
        setStatusTitle('Gagal');
        setStatusMessage('Foto tidak tersimpan. Silakan coba kirim ulang laporan.');
        setStatusDetail('Server berhasil membuat report, tetapi tidak mengembalikan URL foto.');
        setStatusOpen(true);
        return;
      }
      setStatusType('success');
      setStatusTitle('Berhasil');
      setStatusMessage('Laporan berhasil dibuat.');
      setStatusDetail(returnedPhotos.length > 0 ? `Foto tersimpan: ${returnedPhotos.length}` : '');
      setStatusOpen(true);
    } catch (e: any) {
      const url = e?.detail?.url ? String(e.detail.url) : '';
      const body = e?.detail?.body ? JSON.stringify(e.detail.body) : '';
      const detail = e?.detail?.error ? String(e.detail.error) : '';
      setStatusType('error');
      setStatusTitle('Gagal');
      setStatusMessage(e?.message || 'Gagal mengirim report');
      setStatusDetail([url, detail, body].filter(Boolean).join('\n'));
      setStatusOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
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
          placeholderTextColor={colors.muted}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Foto ({photos.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
          {photos.map((p, idx) => (
            <View key={idx} style={styles.photoBox}>
              <Image source={{ uri: p.uri }} style={styles.photoPreview} />
              <Pressable style={styles.removeBtn} onPress={() => removePhoto(idx)}>
                <Text style={styles.removeText}>X</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addPhotoBtn} onPress={pickPhotos}>
            <Text style={styles.addPhotoText}>+</Text>
          </Pressable>
        </ScrollView>

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Mengirim...' : 'Kirim Report'}</Text>
        </Pressable>
      </View>

      <Modal visible={statusOpen} transparent onRequestClose={() => setStatusOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, statusType === 'error' ? styles.modalTitleError : styles.modalTitleSuccess]}>{statusTitle}</Text>
            <Text style={styles.modalMessage}>{statusMessage}</Text>
            {statusDetail ? <Text style={styles.modalDetail}>{statusDetail}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnSecondary]}
                onPress={() => {
                  setStatusOpen(false);
                }}
              >
                <Text style={styles.modalBtnSecondaryText}>Tutup</Text>
              </Pressable>
              {statusType === 'success' ? (
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={() => {
                    setStatusOpen(false);
                    onDone();
                  }}
                >
                  <Text style={styles.modalBtnPrimaryText}>OK</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 12 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    label: { fontWeight: '800', color: colors.text },
    select: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: colors.inputBg },
    selectText: { color: colors.text, fontWeight: '700' },
    toolList: { marginTop: 10, gap: 8 },
    toolItem: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card },
    toolItemActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
    toolCode: { fontFamily: 'monospace', backgroundColor: 'rgba(42,53,71,0.16)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontWeight: '800', color: colors.text },
    toolName: { flex: 1, fontWeight: '700', color: colors.text },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    pill: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.card },
    pillActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
    pillText: { color: colors.text, fontWeight: '800' },
    pillTextActive: { color: colors.primary },
    input: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, textAlignVertical: 'top', backgroundColor: colors.inputBg, color: colors.text },
    photosRow: { marginTop: 10, flexDirection: 'row' },
    photoBox: { position: 'relative', marginRight: 10 },
    photoPreview: { width: 80, height: 80, borderRadius: 12 },
    removeBtn: { position: 'absolute', top: -5, right: -5, backgroundColor: colors.danger, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    addPhotoBtn: { width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56,189,248,0.14)' },
    addPhotoText: { fontSize: 24, color: colors.primary },
    button: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '800' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalCard: { width: '100%', maxWidth: 520, backgroundColor: colors.card, borderRadius: 16, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
    modalTitleSuccess: { color: '#16a34a' },
    modalTitleError: { color: colors.danger },
    modalMessage: { marginTop: 8, fontSize: 14, color: colors.text, fontWeight: '700' },
    modalDetail: { marginTop: 10, fontSize: 12, color: colors.muted },
    modalActions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
    modalBtnSecondary: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    modalBtnSecondaryText: { color: colors.text, fontWeight: '800' },
    modalBtnPrimary: { backgroundColor: colors.primary },
    modalBtnPrimaryText: { color: '#fff', fontWeight: '900' },
  });
