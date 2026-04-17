import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faCamera, faChevronDown, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons';
import { apiRequest } from '../../api/client';
import { Report, Tool } from '../../types';

type Props = {
  token: string;
  toolId?: string;
  onDone: () => void;
};

export default function AdminReportFormScreen({ token, toolId: initialToolId, onDone }: Props) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [selectedToolId, setSelectedToolId] = useState(initialToolId || '');
  const [condition, setCondition] = useState<'Good' | 'Bad'>('Good');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(!initialToolId);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusDetail, setStatusDetail] = useState('');

  useEffect(() => {
    if (!initialToolId) {
      loadTools();
    }
  }, [initialToolId]);

  const loadTools = async () => {
    setLoadingTools(true);
    try {
      const q = search.trim();
      const url = q ? `/api/mobile/tools?search=${encodeURIComponent(q)}` : '/api/mobile/tools';
      const data = await apiRequest<Tool[]>(url, { token });
      setTools(data.filter((t) => (t.status !== false) && (t.condition || 'Good') !== 'Bad'));
    } catch (e: any) {
      const url = e?.detail?.url ? String(e.detail.url) : '';
      const body = e?.detail?.body ? JSON.stringify(e.detail.body) : '';
      setStatusType('error');
      setStatusTitle('Gagal');
      setStatusMessage(e?.message || 'Gagal memuat tools');
      setStatusDetail([url, body].filter(Boolean).join('\n'));
      setStatusOpen(true);
    } finally {
      setLoadingTools(false);
    }
  };

  const selectedTool = tools.find(t => t._id === selectedToolId);

  const pickPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
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
      quality: 0.7,
    });
    if (!res.canceled && res.assets) {
      setPhotos([...photos, ...res.assets]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setStatusType('error');
      setStatusTitle('Izin');
      setStatusMessage('Izin kamera diperlukan untuk mengambil foto');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    if (!res.canceled && res.assets[0]) {
      setPhotos([...photos, res.assets[0]]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const submit = async () => {
    if (!selectedToolId && !initialToolId) {
      setStatusType('error');
      setStatusTitle('Validasi');
      setStatusMessage('Silakan pilih tool terlebih dahulu');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }
    
    if (condition === 'Bad' && !description.trim()) {
      setStatusType('error');
      setStatusTitle('Validasi');
      setStatusMessage('Keterangan wajib diisi jika kondisi rusak');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }

    const invalidTool = selectedToolId ? tools.find((t) => t._id === selectedToolId) : null;
    if (invalidTool && (invalidTool.status === false || (invalidTool.condition || 'Good') === 'Bad')) {
      setStatusType('error');
      setStatusTitle('Validasi');
      setStatusMessage('Tools berstatus BAD / tidak aktif. Tidak bisa dibuat laporan lagi sebelum diperbaiki.');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('toolId', selectedToolId || initialToolId || '');
      fd.append('condition', condition);
      fd.append('description', description);
      fd.append('expectedPhotoCount', String(photos.length));
      
      if (Platform.OS === 'web') {
        for (let index = 0; index < photos.length; index++) {
          const photo = photos[index];
          if (!photo?.uri) continue;
          const name = photo.fileName || `report-${Date.now()}-${index}.jpg`;
          const directFile = (photo as any)?.file as File | undefined;
          let file: File;
          if (directFile instanceof File) {
            file = new File([directFile], directFile.name || name, { type: directFile.type || photo.mimeType || 'image/jpeg' });
          } else {
            const fetched = await fetch(photo.uri);
            const blob = await fetched.blob();
            const type = photo.mimeType || blob.type || 'image/jpeg';
            file = new File([blob], name, { type });
          }
          if (!file.size) {
            throw new Error('File foto kosong / tidak terbaca (0 bytes)');
          }
          fd.append('photo', file);
        }
      } else {
        photos.forEach((photo, index) => {
          if (photo.uri) {
            const name = photo.fileName || `report-${Date.now()}-${index}.jpg`;
            const type = photo.mimeType || 'image/jpeg';
            // @ts-ignore
            fd.append('photo', { uri: photo.uri, name, type });
          }
        });
      }

      const created = await apiRequest<Report>('/api/mobile/reports', {
        method: 'POST',
        body: fd,
        token,
      });

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
      setStatusMessage(e?.message || 'Gagal mengirim laporan');
      setStatusDetail([url, detail, body].filter(Boolean).join('\n'));
      setStatusOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {!initialToolId && (
          <>
            <Text style={styles.label}>Pilih Tool</Text>
            <Pressable 
              style={styles.pickerToggle} 
              onPress={() => setShowToolPicker(!showToolPicker)}
            >
              <Text style={styles.pickerToggleText}>
                {selectedTool ? `${selectedTool.toolCode} - ${selectedTool.name}` : 'Pilih Tool...'}
              </Text>
              <FontAwesomeIcon icon={faChevronDown} size={14} color="#6b7280" />
            </Pressable>

            {showToolPicker && (
              <View style={styles.toolPickerContainer}>
                <View style={styles.searchBox}>
                  <FontAwesomeIcon icon={faSearch} size={14} color="#9ca3af" />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Cari tool..."
                    style={styles.searchInput}
                    onBlur={loadTools}
                    onSubmitEditing={loadTools}
                  />
                </View>
                <View style={styles.toolList}>
                  {loadingTools ? (
                    <ActivityIndicator size="small" color="#0E5E7E" style={{ padding: 20 }} />
                  ) : tools.length === 0 ? (
                    <Text style={styles.emptyText}>Tidak ada tool ditemukan</Text>
                  ) : (
                    tools.map(t => (
                      <Pressable 
                        key={t._id} 
                        style={[styles.toolItem, selectedToolId === t._id && styles.toolItemActive]}
                        onPress={() => {
                          setSelectedToolId(t._id);
                          setShowToolPicker(false);
                        }}
                      >
                        <Text style={[styles.toolItemCode, selectedToolId === t._id && styles.toolItemTextActive]}>
                          {t.toolCode}
                        </Text>
                        <Text style={[styles.toolItemName, selectedToolId === t._id && styles.toolItemTextActive]} numberOfLines={1}>
                          {t.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>
            )}
          </>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Kondisi</Text>
        <View style={styles.conditionRow}>
          <Pressable 
            onPress={() => setCondition('Good')} 
            style={[styles.conditionBtn, condition === 'Good' && styles.conditionBtnActive, { borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
          >
            <Text style={[styles.conditionText, condition === 'Good' && styles.conditionTextActive]}>Baik</Text>
          </Pressable>
          <Pressable 
            onPress={() => setCondition('Bad')} 
            style={[styles.conditionBtn, condition === 'Bad' && styles.conditionBtnActive, { borderTopRightRadius: 12, borderBottomRightRadius: 12 }]}
          >
            <Text style={[styles.conditionText, condition === 'Bad' && styles.conditionTextActive]}>Rusak</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Keterangan</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Tulis keterangan kondisi tool..."
          style={styles.textArea}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Foto Kondisi ({photos.length})</Text>
        <View style={styles.photoSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosScroll}>
            {photos.map((p, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: p.uri }} style={styles.previewImage} />
                <Pressable style={styles.removePhoto} onPress={() => removePhoto(index)}>
                  <FontAwesomeIcon icon={faTimes} size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            <View style={styles.photoButtons}>
              <Pressable style={styles.photoBtnSmall} onPress={takePhoto}>
                <FontAwesomeIcon icon={faCamera} size={16} color="#0E5E7E" />
                <Text style={styles.photoBtnTextSmall}>Kamera</Text>
              </Pressable>
              <Pressable style={styles.photoBtnSmall} onPress={pickPhotos}>
                <FontAwesomeIcon icon={faCamera} size={16} color="#0E5E7E" />
                <Text style={styles.photoBtnTextSmall}>Galeri</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>

        <Pressable 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={submit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Simpan Laporan</Text>
          )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  pickerToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb' },
  pickerToggleText: { color: '#111827', fontSize: 14 },
  toolPickerContainer: { marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', backgroundColor: '#fff' },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 },
  toolList: { maxHeight: 200 },
  toolItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolItemActive: { backgroundColor: '#0E5E7E' },
  toolItemCode: { fontSize: 12, fontWeight: '700', color: '#0E5E7E', backgroundColor: '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  toolItemName: { fontSize: 14, color: '#4b5563', flex: 1 },
  toolItemTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 14 },
  conditionRow: { flexDirection: 'row', marginTop: 4 },
  conditionBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  conditionBtnActive: { backgroundColor: '#0E5E7E', borderColor: '#0E5E7E' },
  conditionText: { fontWeight: '700', color: '#6b7280' },
  conditionTextActive: { color: '#fff' },
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', minHeight: 100, textAlignVertical: 'top', backgroundColor: '#f9fafb' },
  photoSection: { marginTop: 4 },
  photosScroll: { flexDirection: 'row', gap: 12 },
  photoContainer: { position: 'relative', width: 100, height: 100, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f3f4f6' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtnSmall: { width: 80, height: 100, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: '#0E5E7E', borderRadius: 12, backgroundColor: '#f0f9ff' },
  photoBtnTextSmall: { color: '#0E5E7E', fontWeight: '700', fontSize: 11 },
  submitBtn: { marginTop: 24, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', shadowColor: '#0E5E7E', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  modalTitleSuccess: { color: '#16a34a' },
  modalTitleError: { color: '#ef4444' },
  modalMessage: { marginTop: 8, fontSize: 14, color: '#111827', fontWeight: '700' },
  modalDetail: { marginTop: 10, fontSize: 12, color: '#374151' },
  modalActions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  modalBtnSecondary: { backgroundColor: '#f3f4f6' },
  modalBtnSecondaryText: { color: '#111827', fontWeight: '800' },
  modalBtnPrimary: { backgroundColor: '#0E5E7E' },
  modalBtnPrimaryText: { color: '#fff', fontWeight: '900' },
});
