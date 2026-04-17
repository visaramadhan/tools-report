import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faImage } from '@fortawesome/free-solid-svg-icons';
import { apiRequest, getApiBaseUrlForDisplay } from '../../api/client';
import { Replacement, Tool, Transfer } from '../../types';
import { useAppTheme } from '../../theme';

type Props = {
  token: string;
  onOpenReport: (tool?: Tool) => void;
  onOpenReturnOld: (replacement: Replacement) => void;
  onLogout: () => void;
};

function statusText(status: string) {
  if (status === 'Requested') return 'Menunggu review admin';
  if (status === 'Approved') return 'Tools pengganti akan dikirim';
  if (status === 'Shipped') return 'Tools pengganti sedang dikirim';
  if (status === 'ReplacementReceived') return 'Silakan kirim tools lama';
  if (status === 'OldToolInTransit') return 'Tools lama sedang dikirim';
  if (status === 'OldReturned') return 'Tools lama diterima admin';
  if (status === 'Verified') return 'Verifikasi admin selesai';
  if (status === 'Completed') return 'Selesai';
  if (status === 'Rejected') return 'Ditolak';
  return status;
}

export default function ToolsScreen({ token, onOpenReport, onOpenReturnOld, onLogout }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnTool, setReturnTool] = useState<Tool | null>(null);
  const [returnNote, setReturnNote] = useState('');
  const [returnPhoto, setReturnPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTool, setTransferTool] = useState<Tool | null>(null);
  const [technicians, setTechnicians] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [transferToId, setTransferToId] = useState('');
  const [transferCondition, setTransferCondition] = useState<'Good' | 'Bad'>('Good');
  const [transferNote, setTransferNote] = useState('');
  const [transferPhoto, setTransferPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [acceptTransferOpen, setAcceptTransferOpen] = useState(false);
  const [acceptTransferItem, setAcceptTransferItem] = useState<Transfer | null>(null);
  const [acceptCondition, setAcceptCondition] = useState<'Good' | 'Bad'>('Good');
  const [acceptNote, setAcceptNote] = useState('');
  const [acceptPhoto, setAcceptPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [submittingAcceptTransfer, setSubmittingAcceptTransfer] = useState(false);

  const load = useCallback(async () => {
    const [t, r, tr] = await Promise.all([
      apiRequest<Tool[]>('/api/mobile/tools/mine', { token }),
      apiRequest<Replacement[]>('/api/mobile/replacements', { token }),
      apiRequest<Transfer[]>('/api/mobile/transfers?type=incoming', { token }),
    ]);
    setTools(t);
    setReplacements(r.filter((x) => x.status !== 'Completed' && x.status !== 'Rejected'));
    setIncomingTransfers(tr.filter((x) => x.status === 'Pending'));
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const baseUrl = await getApiBaseUrlForDisplay();
        setApiBaseUrl(baseUrl);
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const acceptReplacement = async (id: string) => {
    try {
      await apiRequest(`/api/mobile/replacements/${id}/accept`, { method: 'PUT', token });
      await load();
      Alert.alert('Berhasil', 'Tools pengganti diterima');
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const openReturn = useCallback((tool: Tool) => {
    setReturnTool(tool);
    setReturnNote('');
    setReturnPhoto(null);
    setReturnOpen(true);
  }, []);

  const openTransfer = useCallback(async (tool: Tool) => {
    setTransferTool(tool);
    setTransferToId('');
    setTransferCondition('Good');
    setTransferNote('');
    setTransferPhoto(null);
    setTransferOpen(true);
    try {
      const users = await apiRequest<Array<{ id: string; name: string; email?: string }>>('/api/mobile/technicians', { token });
      setTechnicians(users);
    } catch {
      setTechnicians([]);
    }
  }, [token]);

  const pickTransferPhoto = useCallback(async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) setTransferPhoto(res.assets[0]);
  }, []);

  const submitTransfer = useCallback(async () => {
    if (!transferTool) return;
    if (!transferToId) {
      Alert.alert('Validasi', 'Peminjam baru wajib dipilih');
      return;
    }
    if (!transferNote.trim()) {
      Alert.alert('Validasi', 'Keterangan/No. Resi wajib diisi');
      return;
    }
    if (!transferPhoto?.uri) {
      Alert.alert('Validasi', 'Foto terakhir wajib diambil');
      return;
    }
    if (submittingTransfer) return;
    setSubmittingTransfer(true);
    try {
      const fd = new FormData();
      fd.append('toTechnicianId', transferToId);
      fd.append('condition', transferCondition);
      fd.append('note', transferNote.trim());

      if (Platform.OS === 'web') {
        const name = transferPhoto.fileName || `transfer-${Date.now()}.jpg`;
        const directFile = (transferPhoto as any)?.file as File | undefined;
        let file: File;
        if (directFile instanceof File) {
          file = new File([directFile], directFile.name || name, { type: directFile.type || transferPhoto.mimeType || 'image/jpeg' });
        } else {
          const fetched = await fetch(transferPhoto.uri);
          const blob = await fetched.blob();
          file = new File([blob], name, { type: blob.type || transferPhoto.mimeType || 'image/jpeg' });
        }
        fd.append('photo', file as any);
      } else {
        fd.append('photo', { uri: transferPhoto.uri, name: transferPhoto.fileName || `transfer-${Date.now()}.jpg`, type: transferPhoto.mimeType || 'image/jpeg' } as any);
      }

      await apiRequest(`/api/mobile/tools/${transferTool._id}/transfer`, { method: 'POST', token, body: fd });
      setTransferOpen(false);
      setTransferTool(null);
      Alert.alert('Berhasil', 'Transfer dibuat. Menunggu teknisi tujuan menerima tools.');
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal transfer');
    } finally {
      setSubmittingTransfer(false);
    }
  }, [load, submittingTransfer, token, transferCondition, transferNote, transferPhoto, transferToId, transferTool]);

  const openAcceptTransfer = useCallback((item: Transfer) => {
    setAcceptTransferItem(item);
    setAcceptCondition('Good');
    setAcceptNote('');
    setAcceptPhoto(null);
    setAcceptTransferOpen(true);
  }, []);

  const pickAcceptPhoto = useCallback(async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) setAcceptPhoto(res.assets[0]);
  }, []);

  const submitAcceptTransfer = useCallback(async () => {
    if (!acceptTransferItem) return;
    if (!acceptPhoto?.uri) {
      Alert.alert('Validasi', 'Foto saat diterima wajib diambil');
      return;
    }
    if (submittingAcceptTransfer) return;
    setSubmittingAcceptTransfer(true);
    try {
      const fd = new FormData();
      fd.append('condition', acceptCondition);
      fd.append('note', acceptNote.trim());

      if (Platform.OS === 'web') {
        const name = acceptPhoto.fileName || `transfer-accept-${Date.now()}.jpg`;
        const directFile = (acceptPhoto as any)?.file as File | undefined;
        let file: File;
        if (directFile instanceof File) {
          file = new File([directFile], directFile.name || name, { type: directFile.type || acceptPhoto.mimeType || 'image/jpeg' });
        } else {
          const fetched = await fetch(acceptPhoto.uri);
          const blob = await fetched.blob();
          file = new File([blob], name, { type: blob.type || acceptPhoto.mimeType || 'image/jpeg' });
        }
        fd.append('photo', file as any);
      } else {
        fd.append('photo', { uri: acceptPhoto.uri, name: acceptPhoto.fileName || `transfer-accept-${Date.now()}.jpg`, type: acceptPhoto.mimeType || 'image/jpeg' } as any);
      }

      await apiRequest(`/api/mobile/transfers/${acceptTransferItem._id}/accept`, { method: 'PUT', token, body: fd });
      setAcceptTransferOpen(false);
      setAcceptTransferItem(null);
      Alert.alert('Berhasil', 'Tools diterima dan sekarang aktif dipinjam oleh Anda');
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal menerima transfer');
    } finally {
      setSubmittingAcceptTransfer(false);
    }
  }, [acceptCondition, acceptNote, acceptPhoto, acceptTransferItem, load, submittingAcceptTransfer, token]);
  const pickReturnPhoto = useCallback(async () => {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setReturnPhoto(res.assets[0]);
    }
  }, []);

  const submitReturn = useCallback(async () => {
    if (!returnTool) return;
    const loanId = String(returnTool.currentLoanId || '');
    if (!loanId) {
      Alert.alert('Gagal', 'Loan ID tidak ditemukan pada tools ini.');
      return;
    }
    if (!returnNote.trim()) {
      Alert.alert('Validasi', 'Keterangan/No. Resi wajib diisi');
      return;
    }
    if (!returnPhoto?.uri) {
      Alert.alert('Validasi', 'Foto terakhir sebelum kirim wajib diambil');
      return;
    }

    if (submittingReturn) return;
    setSubmittingReturn(true);
    try {
      const fd = new FormData();
      fd.append('note', returnNote.trim());

      if (Platform.OS === 'web') {
        const name = returnPhoto.fileName || `return-${Date.now()}.jpg`;
        const directFile = (returnPhoto as any)?.file as File | undefined;
        let file: File;
        if (directFile instanceof File) {
          file = new File([directFile], directFile.name || name, { type: directFile.type || returnPhoto.mimeType || 'image/jpeg' });
        } else {
          const fetched = await fetch(returnPhoto.uri);
          const blob = await fetched.blob();
          file = new File([blob], name, { type: blob.type || returnPhoto.mimeType || 'image/jpeg' });
        }
        fd.append('photo', file as any);
      } else {
        fd.append('photo', {
          uri: returnPhoto.uri,
          name: returnPhoto.fileName || `return-${Date.now()}.jpg`,
          type: returnPhoto.mimeType || 'image/jpeg',
        } as any);
      }

      await apiRequest(`/api/mobile/loans/${loanId}/return-request/${returnTool._id}`, { method: 'PUT', token, body: fd });
      setReturnOpen(false);
      setReturnTool(null);
      Alert.alert('Berhasil', 'Permintaan pengembalian dikirim. Menunggu verifikasi admin.');
      await load();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal mengirim pengembalian');
    } finally {
      setSubmittingReturn(false);
    }
  }, [load, returnNote, returnPhoto, returnTool, submittingReturn, token]);

  const sortedTools = useMemo(() => {
    const bad = tools.filter((t) => (t.condition || 'Good') === 'Bad' || t.status === false);
    const good = tools.filter((t) => !((t.condition || 'Good') === 'Bad' || t.status === false));
    return [...bad, ...good];
  }, [tools]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools Saya</Text>
      </View>

      <FlatList
        data={[{ key: 'tools' }, { key: 'incomingTransfers' }, { key: 'replacements' }] as const}
        keyExtractor={(i) => i.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : null}
        renderItem={({ item }) => {
          if (item.key === 'tools') {
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Sedang Dipinjam</Text>
                  <Pressable onPress={() => onOpenReport()}>
                    <Text style={styles.link}>Buat Report</Text>
                  </Pressable>
                </View>
                {tools.length === 0 ? (
                  <Text style={styles.muted}>Tidak ada tools dipinjam</Text>
                ) : (
                  sortedTools.map((t) => {
                    const isBad = (t.condition || 'Good') === 'Bad' || t.status === false;
                    const isSingleUse = t.isSingleUse === true;
                    return (
                    <View key={t._id} style={[styles.rowWrap, isBad && styles.rowBad]}>
                      <View style={styles.rowMain}>
                        <Pressable style={styles.rowContent} onPress={() => (isBad ? null : onOpenReport(t))} disabled={isBad}>
                          {t.photoUrl ? (
                            <Image source={{ uri: t.photoUrl.startsWith('http') ? t.photoUrl : `${apiBaseUrl}${t.photoUrl}` }} style={styles.thumb} />
                          ) : (
                            <View style={styles.thumbPlaceholder}>
                              <FontAwesomeIcon icon={faImage} size={16} color="#9ca3af" />
                            </View>
                          )}
                          <View style={styles.rowInfo}>
                            <Text style={styles.code}>{t.toolCode}</Text>
                            <Text style={styles.rowText} numberOfLines={1}>
                              {t.name}
                            </Text>
                            {isBad ? <Text style={styles.badText}>BAD - Wajib Dikembalikan</Text> : null}
                          </View>
                        </Pressable>

                        {isBad ? (
                          <Pressable style={[styles.actionBtn, submittingReturn && styles.buttonDisabled]} onPress={() => openReturn(t)} disabled={submittingReturn}>
                            <Text style={styles.actionBtnText}>Pengembalian</Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            style={[styles.actionBtn, (submittingTransfer || isSingleUse) && styles.buttonDisabled]}
                            onPress={() => openTransfer(t)}
                            disabled={submittingTransfer || isSingleUse}
                          >
                            <Text style={styles.actionBtnText}>{isSingleUse ? 'Tidak Bisa' : 'Transfer'}</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                    );
                  })
                )}
              </View>
            );
          }

          if (item.key === 'incomingTransfers') {
            return (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Transfer Masuk</Text>
                {incomingTransfers.length === 0 ? (
                  <Text style={styles.muted}>Tidak ada transfer masuk</Text>
                ) : (
                  incomingTransfers.map((tr) => (
                    <View key={tr._id} style={styles.repl}>
                      <Text style={styles.replTitle}>
                        <Text style={styles.code}>{tr.toolCode}</Text> {tr.toolName}
                      </Text>
                      <Text style={styles.replSub}>Dari: {tr.fromTechnicianName}</Text>
                      <Text style={styles.replSub}>Kondisi Kirim: {tr.condition}</Text>
                      {tr.description ? <Text style={styles.muted}>Resi/Keterangan: {tr.description}</Text> : null}
                      <Pressable style={styles.button} onPress={() => openAcceptTransfer(tr)}>
                        <Text style={styles.buttonText}>Terima</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            );
          }

          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Penukaran Alat</Text>
              {replacements.length === 0 ? (
                <Text style={styles.muted}>Tidak ada proses penukaran</Text>
              ) : (
                replacements.map((r) => (
                  <View key={r._id} style={styles.repl}>
                    <Text style={styles.replTitle}>
                      Lama: <Text style={styles.code}>{r.oldToolCode}</Text> {r.oldToolName}
                    </Text>
                    {r.newToolCode ? (
                      <Text style={styles.replSub}>
                        Baru: <Text style={styles.code}>{r.newToolCode}</Text> {r.newToolName}
                      </Text>
                    ) : null}
                    <Text style={styles.muted}>{statusText(r.status)}</Text>
                    {r.status === 'Shipped' ? (
                      <Pressable style={styles.button} onPress={() => acceptReplacement(r._id)}>
                        <Text style={styles.buttonText}>Terima Tools</Text>
                      </Pressable>
                    ) : null}
                    {r.status === 'ReplacementReceived' ? (
                      <Pressable style={styles.button} onPress={() => onOpenReturnOld(r)}>
                        <Text style={styles.buttonText}>Kirim Tools Lama</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          );
        }}
      />

      <Modal visible={returnOpen} transparent animationType="slide" onRequestClose={() => (!submittingReturn ? setReturnOpen(false) : null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pengembalian Tools (BAD)</Text>
            <Text style={styles.modalMeta} numberOfLines={2}>
              {returnTool ? `${returnTool.toolCode} - ${returnTool.name}` : ''}
            </Text>

            <Text style={styles.modalLabel}>Keterangan / No. Resi</Text>
            <TextInput value={returnNote} onChangeText={setReturnNote} placeholder="Contoh: Resi JNE 123..." style={styles.modalInput} />

            <Text style={styles.modalLabel}>Foto Terakhir Sebelum Kirim</Text>
            <Pressable style={styles.photoBtn} onPress={pickReturnPhoto} disabled={submittingReturn}>
              <Text style={styles.photoBtnText}>{returnPhoto?.uri ? 'Ganti Foto' : 'Ambil Foto'}</Text>
            </Pressable>
            {returnPhoto?.uri ? <Image source={{ uri: returnPhoto.uri }} style={styles.photoPreview} /> : null}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setReturnOpen(false)} disabled={submittingReturn}>
                <Text style={styles.modalBtnSecondaryText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary, submittingReturn && styles.buttonDisabled]} onPress={submitReturn} disabled={submittingReturn}>
                <Text style={styles.modalBtnPrimaryText}>{submittingReturn ? 'Mengirim...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={transferOpen} transparent animationType="slide" onRequestClose={() => (!submittingTransfer ? setTransferOpen(false) : null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transfer Tools</Text>
            <Text style={styles.modalMeta} numberOfLines={2}>
              {transferTool ? `${transferTool.toolCode} - ${transferTool.name}` : ''}
            </Text>

            <Text style={styles.modalLabel}>Peminjam Baru</Text>
            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
              {technicians.length === 0 ? <Text style={styles.mutedText}>Tidak ada teknisi tersedia</Text> : null}
              {technicians.map((u) => (
                <Pressable key={u.id} style={[styles.pickRow, transferToId === u.id && styles.pickRowOn]} onPress={() => setTransferToId(u.id)} disabled={submittingTransfer}>
                  <Text style={[styles.pickText, transferToId === u.id && styles.pickTextOn]}>{u.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Kondisi</Text>
            <View style={styles.conditionRow}>
              <Pressable onPress={() => setTransferCondition('Good')} style={[styles.condBtn, transferCondition === 'Good' && styles.condBtnOn]} disabled={submittingTransfer}>
                <Text style={[styles.condText, transferCondition === 'Good' && styles.condTextOn]}>Good</Text>
              </Pressable>
              <Pressable onPress={() => setTransferCondition('Bad')} style={[styles.condBtn, transferCondition === 'Bad' && styles.condBtnOn]} disabled={submittingTransfer}>
                <Text style={[styles.condText, transferCondition === 'Bad' && styles.condTextOn]}>Bad</Text>
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Keterangan / No. Resi</Text>
            <TextInput value={transferNote} onChangeText={setTransferNote} placeholder="Contoh: Resi JNE 123..." style={styles.modalInput} editable={!submittingTransfer} />

            <Text style={styles.modalLabel}>Foto Terakhir</Text>
            <Pressable style={styles.photoBtn} onPress={pickTransferPhoto} disabled={submittingTransfer}>
              <Text style={styles.photoBtnText}>{transferPhoto?.uri ? 'Ganti Foto' : 'Ambil Foto'}</Text>
            </Pressable>
            {transferPhoto?.uri ? <Image source={{ uri: transferPhoto.uri }} style={styles.photoPreview} /> : null}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setTransferOpen(false)} disabled={submittingTransfer}>
                <Text style={styles.modalBtnSecondaryText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary, submittingTransfer && styles.buttonDisabled]} onPress={submitTransfer} disabled={submittingTransfer}>
                <Text style={styles.modalBtnPrimaryText}>{submittingTransfer ? 'Mengirim...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={acceptTransferOpen} transparent animationType="slide" onRequestClose={() => (!submittingAcceptTransfer ? setAcceptTransferOpen(false) : null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terima Transfer Tools</Text>
            <Text style={styles.modalMeta} numberOfLines={2}>
              {acceptTransferItem ? `${acceptTransferItem.toolCode} - ${acceptTransferItem.toolName}` : ''}
            </Text>
            {acceptTransferItem?.description ? <Text style={styles.muted}>Resi/Keterangan pengiriman: {acceptTransferItem.description}</Text> : null}

            <Text style={styles.modalLabel}>Kondisi Saat Diterima</Text>
            <View style={styles.conditionRow}>
              <Pressable onPress={() => setAcceptCondition('Good')} style={[styles.condBtn, acceptCondition === 'Good' && styles.condBtnOn]} disabled={submittingAcceptTransfer}>
                <Text style={[styles.condText, acceptCondition === 'Good' && styles.condTextOn]}>Good</Text>
              </Pressable>
              <Pressable onPress={() => setAcceptCondition('Bad')} style={[styles.condBtn, acceptCondition === 'Bad' && styles.condBtnOn]} disabled={submittingAcceptTransfer}>
                <Text style={[styles.condText, acceptCondition === 'Bad' && styles.condTextOn]}>Bad</Text>
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Catatan Penerimaan (Opsional)</Text>
            <TextInput value={acceptNote} onChangeText={setAcceptNote} placeholder="Catatan saat menerima..." style={styles.modalInput} editable={!submittingAcceptTransfer} />

            <Text style={styles.modalLabel}>Foto Terakhir Saat Diterima</Text>
            <Pressable style={styles.photoBtn} onPress={pickAcceptPhoto} disabled={submittingAcceptTransfer}>
              <Text style={styles.photoBtnText}>{acceptPhoto?.uri ? 'Ganti Foto' : 'Ambil Foto'}</Text>
            </Pressable>
            {acceptPhoto?.uri ? <Image source={{ uri: acceptPhoto.uri }} style={styles.photoPreview} /> : null}

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.modalBtnSecondary]} onPress={() => setAcceptTransferOpen(false)} disabled={submittingAcceptTransfer}>
                <Text style={styles.modalBtnSecondaryText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnPrimary, submittingAcceptTransfer && styles.buttonDisabled]} onPress={submitAcceptTransfer} disabled={submittingAcceptTransfer}>
                <Text style={styles.modalBtnPrimaryText}>{submittingAcceptTransfer ? 'Memproses...' : 'Terima'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { padding: 16, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 22, color: colors.text, textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
    link: { color: colors.primary, fontWeight: '700' },
    list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
    muted: { marginTop: 6, color: colors.muted },
    rowWrap: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, paddingBottom: 10 },
    rowBad: { backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, paddingHorizontal: 10 },
    rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
    thumb: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(42,53,71,0.16)' },
    thumbPlaceholder: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,53,71,0.16)' },
    rowInfo: { flex: 1 },
    code: { fontFamily: 'monospace', backgroundColor: 'rgba(42,53,71,0.16)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, color: colors.text, fontWeight: '700', alignSelf: 'flex-start' },
    rowText: { marginTop: 6, color: colors.text, fontFamily: 'Roboto_700Bold' },
    badText: { marginTop: 6, color: colors.danger, fontWeight: '900' },
    mutedText: { color: colors.muted, marginTop: 10, textAlign: 'center' },
    repl: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
    replTitle: { fontWeight: '800', color: colors.text },
    replSub: { fontWeight: '700', color: colors.muted },
    button: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '800' },
    buttonDisabled: { opacity: 0.7 },
    actionBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: '#fff', fontWeight: '900' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    modalCard: { width: '100%', maxWidth: 520, backgroundColor: colors.card, borderRadius: 16, padding: 16 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
    modalMeta: { marginTop: 6, color: colors.muted, fontWeight: '700' },
    modalLabel: { marginTop: 14, marginBottom: 8, color: colors.muted, fontSize: 12, fontWeight: '900' },
    modalInput: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, color: colors.text },
    photoBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
    photoBtnText: { color: '#fff', fontWeight: '900' },
    photoPreview: { marginTop: 10, width: '100%', height: 160, borderRadius: 12, backgroundColor: 'rgba(42,53,71,0.16)' },
    modalActions: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
    modalBtnSecondary: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    modalBtnSecondaryText: { color: colors.text, fontWeight: '900' },
    modalBtnPrimary: { backgroundColor: '#16a34a' },
    modalBtnPrimaryText: { color: '#fff', fontWeight: '900' },
    pickRow: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.card },
    pickRowOn: { borderColor: 'rgba(22,163,74,0.5)', backgroundColor: 'rgba(34,197,94,0.10)' },
    pickText: { color: colors.text, fontWeight: '800' },
    pickTextOn: { color: '#16a34a' },
    conditionRow: { flexDirection: 'row', gap: 10 },
    condBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.card },
    condBtnOn: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
    condText: { fontWeight: '900', color: colors.muted },
    condTextOn: { color: colors.primary },
  });
