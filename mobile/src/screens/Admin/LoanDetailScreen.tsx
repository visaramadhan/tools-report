import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, FlatList, Image, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Loan, Tool } from '../../types';

type Props = {
  token: string;
  loan: Loan;
  onDone: () => void;
};

type ItemState = {
  condition: 'Good' | 'Bad';
  description: string;
  photo?: string;
};

export default function AdminLoanDetailScreen({ token, loan: initialLoan, onDone }: Props) {
  const [loans, setLoans] = useState<Loan[]>([initialLoan]);
  const [stateByTool, setStateByTool] = useState<Record<string, ItemState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [addingTools, setAddingTools] = useState(false);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<Record<string, boolean>>({});
  const [returningToolId, setReturningToolId] = useState<string | null>(null);
  const [verifyingToolId, setVerifyingToolId] = useState<string | null>(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifyPhoto, setVerifyPhoto] = useState<string>('');

  const allItems = useMemo(() => loans.flatMap((l) => l.items.map(it => ({ ...it, loanId: l._id }))), [loans]);
  const pending = useMemo(() => allItems.filter((it) => !it.returnedAt), [allItems]);
  const returned = useMemo(() => allItems.filter((it) => it.returnedAt), [allItems]);
  const returning = useMemo(() => pending.filter((it) => it.status === 'Returning'), [pending]);

  const loadLoans = useCallback(async () => {
    try {
      const data = await apiRequest<Loan[]>(`/api/mobile/loans?borrowerId=${initialLoan.borrowerId}`, { token });
      setLoans(data);
    } catch (e: any) {
      Alert.alert('Gagal', 'Gagal memuat detail peminjaman');
    }
  }, [initialLoan.borrowerId, token]);

  useEffect(() => {
    loadLoans().catch(() => undefined);
  }, [loadLoans]);

  const loadTools = useCallback(async (q: string) => {
    setToolsLoading(true);
    try {
      const query = q.trim();
      const url = query
        ? `/api/mobile/tools?available=true&search=${encodeURIComponent(query)}`
        : '/api/mobile/tools?available=true';
      const data = await apiRequest<Tool[]>(url, { token });
      setAvailableTools(data);
    } finally {
      setToolsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (addingTools) {
      loadTools(search).catch(() => undefined);
    }
  }, [addingTools, loadTools, search]);


  const updateState = (toolId: string, next: Partial<ItemState>) => {
    setStateByTool((prev) => ({
      ...prev,
      [toolId]: { ...(prev[toolId] || { condition: 'Good', description: '' }), ...next },
    }));
  };

  const pickImage = async (toolId: string) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      updateState(toolId, { photo: result.assets[0].uri });
    }
  };

  const pickVerifyPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVerifyPhoto(result.assets[0].uri);
    }
  };

  const submitReturn = async (toolId: string) => {
    const item = allItems.find(it => it.toolId === toolId);
    if (!item) return;

    const s = stateByTool[toolId] || { condition: 'Good', description: '' };
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('condition', s.condition);
      formData.append('description', s.description);
      if (s.photo) {
        const filename = s.photo.split('/').pop() || 'photo.jpg';
        if (Platform.OS === 'web') {
          const fetched = await fetch(s.photo);
          const blob = await fetched.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          formData.append('photo', file as any);
        } else {
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('photo', { uri: s.photo, name: filename, type } as any);
        }
      }

      await apiRequest(`/api/mobile/loans/${item.loanId}/return/${toolId}`, {
        method: 'PUT',
        token,
        body: formData,
      });
      
      Alert.alert('Berhasil', 'Tool berhasil dikembalikan');
      setReturningToolId(null);
      await loadLoans();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal mengembalikan tool');
    } finally {
      setSubmitting(false);
    }
  };

  const submitVerifyReturn = async (toolId: string) => {
    const item = allItems.find((it) => it.toolId === toolId);
    if (!item) return;
    if (!verifyPhoto) {
      Alert.alert('Validasi', 'Foto penerimaan wajib diambil');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('note', verifyNote);

      const filename = verifyPhoto.split('/').pop() || 'photo.jpg';
      if (Platform.OS === 'web') {
        const fetched = await fetch(verifyPhoto);
        const blob = await fetched.blob();
        const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        formData.append('photo', file as any);
      } else {
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('photo', { uri: verifyPhoto, name: filename, type } as any);
      }

      await apiRequest(`/api/mobile/loans/${item.loanId}/verify-return/${toolId}`, {
        method: 'PUT',
        token,
        body: formData,
      });

      Alert.alert('Berhasil', 'Pengembalian berhasil diverifikasi');
      setVerifyingToolId(null);
      setVerifyPhoto('');
      setVerifyNote('');
      await loadLoans();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal verifikasi pengembalian');
    } finally {
      setSubmitting(false);
    }
  };

  

  const addToolsToLoan = async () => {
    const toolIds = Object.entries(selectedToolIds)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (toolIds.length === 0) {
      Alert.alert('Gagal', 'Pilih minimal 1 tool');
      return;
    }

    if (loans.length === 0) return;

    setSubmitting(true);
    try {
      // Add to the latest loan
      await apiRequest(`/api/mobile/loans/${loans[0]._id}`, {
        method: 'PATCH',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolIds }),
      });
      Alert.alert('Berhasil', 'Tool berhasil ditambahkan');
      setSelectedToolIds({});
      setAddingTools(false);
      await loadLoans();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menambahkan tool');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Borrowed': return 'Dipinjam';
      case 'Returning': return 'Sedang Dikembalikan';
      case 'Returned': return 'Dikembalikan';
      case 'Exchanged': return 'Ditukar';
      default: return status;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{initialLoan.borrowerName}</Text>
        <Text style={styles.meta}>Total {loans.length} peminjaman aktif</Text>
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>List Tools</Text>
        <Pressable style={styles.addSmallBtn} onPress={() => setAddingTools(true)}>
          <Text style={styles.addSmallText}>+ Tambah Tools</Text>
        </Pressable>
      </View>

      {pending.map((it) => (
        <View key={it.toolId} style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.itemTitle}>{it.toolCode} - {it.toolName}</Text>
              <Text style={styles.itemStatus}>{getStatusLabel(it.status || 'Borrowed')}</Text>
              {it.reportedCondition === 'Bad' ? <Text style={styles.badFlag}>BAD (Reported)</Text> : null}
              {it.status === 'Returning' ? (
                <>
                  {it.returnShipmentNote ? <Text style={styles.meta}>Resi/Keterangan: {it.returnShipmentNote}</Text> : null}
                  {it.returnShipmentPhotoUrl ? <Text style={styles.meta}>Foto teknisi: ada</Text> : null}
                </>
              ) : null}
            </View>
            {it.status === 'Returning' ? (
              <Pressable
                style={styles.returnBtn}
                onPress={() => {
                  setVerifyingToolId(it.toolId);
                  setVerifyNote('');
                  setVerifyPhoto('');
                }}
              >
                <Text style={styles.returnBtnText}>Verifikasi</Text>
              </Pressable>
            ) : (
              it.reportedCondition === 'Bad' ? (
                <Text style={styles.muted}>Menunggu pengembalian teknisi</Text>
              ) : (
                <Pressable style={styles.returnBtn} onPress={() => setReturningToolId(it.toolId)}>
                  <Text style={styles.returnBtnText}>Pengembalian</Text>
                </Pressable>
              )
            )}
          </View>
        </View>
      ))}

      {returned.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Sudah Dikembalikan</Text>
          {returned.map((it) => (
            <View key={it.toolId} style={[styles.card, { opacity: 0.7 }]}>
              <Text style={styles.itemTitle}>{it.toolCode} - {it.toolName}</Text>
              <Text style={styles.itemStatus}>{getStatusLabel(it.status)} pada {it.returnedAt ? new Date(it.returnedAt).toLocaleString() : '-'}</Text>
            </View>
          ))}
        </>
      )}

      {/* Modal for Return Form */}
      <Modal visible={!!returningToolId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Form Pengembalian</Text>
            <ScrollView>
              {returningToolId && (
                <>
                  <Text style={styles.label}>Kondisi</Text>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => updateState(returningToolId, { condition: 'Good' })}
                      style={[styles.pill, (stateByTool[returningToolId]?.condition || 'Good') === 'Good' && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, (stateByTool[returningToolId]?.condition || 'Good') === 'Good' && styles.pillTextActive]}>Good</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => updateState(returningToolId, { condition: 'Bad' })}
                      style={[styles.pill, stateByTool[returningToolId]?.condition === 'Bad' && styles.pillActive]}
                    >
                      <Text style={[styles.pillText, stateByTool[returningToolId]?.condition === 'Bad' && styles.pillTextActive]}>Bad</Text>
                    </Pressable>
                  </View>

                  <Text style={[styles.label, { marginTop: 15 }]}>Keterangan</Text>
                  <TextInput
                    value={stateByTool[returningToolId]?.description || ''}
                    onChangeText={(v) => updateState(returningToolId, { description: v })}
                    placeholder="Keterangan kondisi..."
                    style={styles.input}
                    multiline
                  />

                  <Text style={[styles.label, { marginTop: 15 }]}>Foto</Text>
                  <Pressable style={styles.photoBtn} onPress={() => pickImage(returningToolId)}>
                    {stateByTool[returningToolId]?.photo ? (
                      <Image source={{ uri: stateByTool[returningToolId]?.photo }} style={styles.photoPreview} />
                    ) : (
                      <Text style={styles.photoBtnText}>Ambil Foto</Text>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>

            <View style={[styles.row, { marginTop: 20 }]}>
              <Pressable style={[styles.button, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setReturningToolId(null)}>
                <Text style={styles.buttonText}>Batal</Text>
              </Pressable>
              <Pressable 
                style={[styles.button, { flex: 2 }, submitting && styles.buttonDisabled]} 
                onPress={() => returningToolId && submitReturn(returningToolId)}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>{submitting ? 'Proses...' : 'Simpan'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!verifyingToolId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verifikasi Pengembalian</Text>
            <ScrollView>
              <Text style={styles.label}>Keterangan (Opsional)</Text>
              <TextInput value={verifyNote} onChangeText={setVerifyNote} placeholder="Catatan penerimaan..." style={styles.input} multiline />
              <Text style={[styles.label, { marginTop: 15 }]}>Foto Barang Diterima</Text>
              <Pressable style={styles.photoBtn} onPress={pickVerifyPhoto}>
                {verifyPhoto ? <Image source={{ uri: verifyPhoto }} style={styles.photoPreview} /> : <Text style={styles.photoBtnText}>Ambil Foto</Text>}
              </Pressable>
            </ScrollView>
            <View style={[styles.row, { marginTop: 20 }]}>
              <Pressable style={[styles.button, { backgroundColor: '#ccc', flex: 1 }]} onPress={() => setVerifyingToolId(null)}>
                <Text style={styles.buttonText}>Batal</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { flex: 2 }, submitting && styles.buttonDisabled]}
                onPress={() => verifyingToolId && submitVerifyReturn(verifyingToolId)}
                disabled={submitting}
              >
                <Text style={styles.buttonText}>{submitting ? 'Proses...' : 'Simpan'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal for Add Tools */}
      <Modal visible={addingTools} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Tambah Tools</Text>
              <Pressable onPress={() => setAddingTools(false)}>
                <Text style={styles.link}>Batal</Text>
              </Pressable>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Cari kode / nama tools..."
              style={styles.input}
            />
            <FlatList
              data={availableTools}
              keyExtractor={(i) => i._id}
              style={{ maxHeight: 300, marginTop: 10 }}
              ListEmptyComponent={toolsLoading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada tools tersedia</Text>}
              renderItem={({ item }) => (
                <Pressable 
                  style={styles.toolRow} 
                  onPress={() => setSelectedToolIds(prev => ({ ...prev, [item._id]: !prev[item._id] }))}
                >
                  <View style={[styles.checkbox, selectedToolIds[item._id] && styles.checkboxOn]} />
                  <View>
                    <Text style={styles.toolCode}>{item.toolCode}</Text>
                    <Text style={styles.toolName}>{item.name}</Text>
                  </View>
                </Pressable>
              )}
            />
            <Pressable 
              style={[styles.button, { marginTop: 15 }, submitting && styles.buttonDisabled]} 
              onPress={addToolsToLoan}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Menambahkan...' : `Tambahkan (${Object.values(selectedToolIds).filter(Boolean).length})`}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Pressable style={[styles.button, { marginTop: 20, backgroundColor: '#6b7280' }]} onPress={onDone}>
        <Text style={styles.buttonText}>Kembali ke List</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A3547' },
  meta: { marginTop: 6, color: '#6b7280' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#374151' },
  addSmallBtn: { backgroundColor: '#0E5E7E', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addSmallText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemTitle: { fontWeight: '800', color: '#111827', fontSize: 14 },
  itemStatus: { fontSize: 12, color: '#0E5E7E', fontWeight: '700', marginTop: 2 },
  badFlag: { marginTop: 8, color: '#ef4444', fontWeight: '900' },
  returnBtn: { backgroundColor: 'rgba(14,94,126,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  returnBtnText: { color: '#0E5E7E', fontWeight: '800', fontSize: 12 },
  muted: { marginTop: 8, color: '#6b7280', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#111827', marginBottom: 15 },
  label: { fontWeight: '800', color: '#374151', fontSize: 14 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb' },
  photoBtn: { marginTop: 8, height: 150, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0E5E7E', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoBtnText: { color: '#0E5E7E', fontWeight: '800' },
  photoPreview: { width: '100%', height: '100%' },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
  link: { color: '#0E5E7E', fontWeight: '800' },
  toolRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#d1d5db' },
  checkboxOn: { backgroundColor: '#0E5E7E', borderColor: '#0E5E7E' },
  toolCode: { color: '#0E5E7E', fontWeight: '800', fontSize: 12 },
  toolName: { fontWeight: '700', color: '#111827' },
});
