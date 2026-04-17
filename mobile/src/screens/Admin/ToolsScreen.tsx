import { useCallback, useMemo, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faFileLines, faHistory, faImage, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
import { apiRequest, getApiBaseUrlForDisplay } from '../../api/client';
import { Tool } from '../../types';
import { useAppTheme } from '../../theme';

type Props = {
  token: string;
  onCreate: () => void;
  onEdit: (toolId: string) => void;
  onOpenCategories: () => void;
  onOpenSubCategories: () => void;
  onViewLoans: (toolId: string) => void;
  onViewReports: (toolId: string) => void;
};

export default function AdminToolsScreen({ 
  token, 
  onCreate, 
  onEdit, 
  onOpenCategories, 
  onOpenSubCategories,
  onViewLoans,
  onViewReports
}: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<'Good' | 'Bad' | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [repairing, setRepairing] = useState(false);
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairTool, setRepairTool] = useState<Tool | null>(null);
  const [repairCondition, setRepairCondition] = useState<'Good' | 'Bad'>('Good');
  const [repairPhoto, setRepairPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const load = useCallback(async () => {
    const q = search.trim();
    const url = q ? `/api/mobile/tools?search=${encodeURIComponent(q)}` : '/api/mobile/tools';
    const data = await apiRequest<Tool[]>(url, { token });
    setTools(data);
  }, [token, search]);

  const remove = async (tool: Tool) => {
    const doDelete = async () => {
      try {
        await apiRequest(`/api/mobile/tools/${tool._id}`, { method: 'DELETE', token });
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal menghapus');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Hapus tools ini?\n${tool.toolCode} - ${tool.name}`) : true;
      if (!ok) return;
      await doDelete();
      return;
    }

    Alert.alert('Hapus Tools', `Hapus tools ini?\n${tool.toolCode} - ${tool.name}`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => doDelete().catch(() => undefined) },
    ]);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const baseUrl = await getApiBaseUrlForDisplay();
        setApiBaseUrl(baseUrl);
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
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

  const filteredTools = useMemo(() => {
    if (!selectedCondition) return tools;
    return tools.filter((t) => (t.condition || 'Good') === selectedCondition);
  }, [tools, selectedCondition]);

  const pickRepairPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin', 'Izin galeri diperlukan untuk upload foto');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets && res.assets.length > 0) {
      setRepairPhoto(res.assets[0]);
    }
  }, []);

  const openRepair = useCallback((tool: Tool) => {
    setRepairTool(tool);
    setRepairCondition('Good');
    setRepairPhoto(null);
    setRepairOpen(true);
  }, []);

  const submitRepair = useCallback(async () => {
    if (!repairTool) return;
    if (!repairPhoto?.uri) {
      Alert.alert('Validasi', 'Foto terbaru wajib diupload saat perbaikan.');
      return;
    }

    const doRepair = async () => {
      setRepairing(true);
      try {
        const fd = new FormData();
        fd.append('condition', repairCondition);
        fd.append('status', repairCondition === 'Bad' ? 'false' : 'true');
        fd.append('description', String(repairTool.description || ''));

        if (Platform.OS === 'web') {
          const name = repairPhoto.fileName || `repair-${Date.now()}.jpg`;
          const directFile = (repairPhoto as any)?.file as File | undefined;
          let file: File;
          if (directFile instanceof File) {
            file = new File([directFile], directFile.name || name, { type: directFile.type || repairPhoto.mimeType || 'image/jpeg' });
          } else {
            const fetched = await fetch(repairPhoto.uri);
            const blob = await fetched.blob();
            file = new File([blob], name, { type: blob.type || repairPhoto.mimeType || 'image/jpeg' });
          }
          fd.append('photo', file as any);
        } else {
          fd.append('photo', {
            uri: repairPhoto.uri,
            name: repairPhoto.fileName || `repair-${Date.now()}.jpg`,
            type: repairPhoto.mimeType || 'image/jpeg',
          } as any);
        }

        await apiRequest(`/api/mobile/tools/${repairTool._id}`, { method: 'PUT', token, body: fd });
        setRepairOpen(false);
        setRepairTool(null);
        Alert.alert('Berhasil', 'Perbaikan berhasil. Status tools sudah diperbarui.');
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal menyimpan perbaikan');
      } finally {
        setRepairing(false);
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm('Apakah sudah benar diperbaiki?') : true;
      if (!ok) return;
      await doRepair();
      return;
    }

    Alert.alert('Konfirmasi', 'Apakah sudah benar diperbaiki?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', style: 'default', onPress: () => doRepair().catch(() => undefined) },
    ]);
  }, [load, repairCondition, repairPhoto, repairTool, token]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Pressable onPress={onCreate} style={styles.addBtn}>
          <Text style={styles.addText}>Tambah</Text>
        </Pressable>
      </View>
      <View style={styles.actionsRow}>
        <Pressable onPress={onOpenCategories} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Kategori</Text>
        </Pressable>
        <Pressable onPress={onOpenSubCategories} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Sub Kategori</Text>
        </Pressable>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Cari nama atau kode" style={styles.input} placeholderTextColor={colors.muted} />
      <Text style={styles.filterLabel}>Kondisi</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCatScroll}>
        <Pressable style={[styles.chip, !selectedCondition && styles.chipActive]} onPress={() => setSelectedCondition(null)}>
          <Text style={[styles.chipText, !selectedCondition && styles.chipTextActive]}>Semua</Text>
        </Pressable>
        <Pressable style={[styles.chip, selectedCondition === 'Good' && styles.chipGoodActive]} onPress={() => setSelectedCondition('Good')}>
          <Text style={[styles.chipText, selectedCondition === 'Good' && styles.chipTextActive]}>Good</Text>
        </Pressable>
        <Pressable style={[styles.chip, selectedCondition === 'Bad' && styles.chipBadActive]} onPress={() => setSelectedCondition('Bad')}>
          <Text style={[styles.chipText, selectedCondition === 'Bad' && styles.chipTextActive]}>Bad</Text>
        </Pressable>
      </ScrollView>
      <FlatList
        data={filteredTools}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada data sesuai filter</Text>}
        renderItem={({ item }) => {
          const photoUrl = item.photoUrl || '';
          let imageUri = '';
          if (photoUrl) {
            if (photoUrl.startsWith('http')) {
              imageUri = photoUrl;
            } else {
              const base = apiBaseUrl ? (apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl) : 'http://localhost:3001';
              const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;
              imageUri = `${base}${path}`;
            }
          }

          const isBad = (item.condition || 'Good') === 'Bad' || item.status === false;
          const isSingleUse = item.isSingleUse === true;

          return (
            <View style={[styles.card, isBad && styles.cardBad]}>
              <Pressable style={styles.row} onPress={() => (isBad ? null : onEdit(item._id))} disabled={isBad}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={styles.thumbPlaceholder}>
                    <FontAwesomeIcon icon={faImage} size={18} color="#9ca3af" />
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.toolCode} - {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.category} • {item.subCategory}
                  </Text>
                  <View
                    style={[
                      styles.conditionPill,
                      (item.condition || 'Good') === 'Bad' ? styles.conditionBad : styles.conditionGood,
                    ]}
                  >
                    <Text
                      style={[
                        styles.conditionText,
                        (item.condition || 'Good') === 'Bad' ? styles.conditionTextBad : styles.conditionTextGood,
                      ]}
                    >
                      {item.condition || 'Good'}
                    </Text>
                  </View>
                  <View style={styles.toolActions}>
                    <Pressable style={styles.actionLink} onPress={() => onViewLoans(item._id)}>
                      <FontAwesomeIcon icon={faHistory} size={12} color="#0E5E7E" />
                      <Text style={styles.actionLinkText}>Riwayat</Text>
                    </Pressable>
                    <Pressable style={styles.actionLink} onPress={() => onViewReports(item._id)}>
                      <FontAwesomeIcon icon={faFileLines} size={12} color="#0E5E7E" />
                      <Text style={styles.actionLinkText}>Laporan</Text>
                    </Pressable>
                  </View>
                </View>
              </Pressable>
              {isBad ? (
                <View style={styles.badActions}>
                  {!isSingleUse ? (
                    <Pressable style={[styles.repairBtn, repairing && styles.btnDisabled]} onPress={() => openRepair(item)} disabled={repairing}>
                      <Text style={styles.repairText}>Perbaiki</Text>
                    </Pressable>
                  ) : null}
                  <Pressable style={[styles.deleteBtn, repairing && styles.btnDisabled]} onPress={() => remove(item)} disabled={repairing}>
                    <Text style={styles.deleteText}>Hapus</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Pressable style={styles.iconBtn} onPress={() => onEdit(item._id)}>
                    <FontAwesomeIcon icon={faPenToSquare} size={18} color="#0E5E7E" />
                  </Pressable>
                  <Pressable style={styles.iconBtn} onPress={() => remove(item)}>
                    <FontAwesomeIcon icon={faTrash} size={18} color="#ef4444" />
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
      />

      <Modal visible={repairOpen} transparent onRequestClose={() => (!repairing ? setRepairOpen(false) : null)}>
        <View style={styles.repairOverlay}>
          <View style={styles.repairCard}>
            <Text style={styles.repairTitle}>Perbaiki Tools</Text>
            <Text style={styles.repairMeta} numberOfLines={2}>
              {repairTool ? `${repairTool.toolCode} - ${repairTool.name}` : ''}
            </Text>

            <Text style={styles.repairLabel}>Kondisi</Text>
            <View style={styles.repairConditionRow}>
              <Pressable
                onPress={() => setRepairCondition('Good')}
                style={[styles.repairConditionBtn, repairCondition === 'Good' && styles.repairConditionBtnGood]}
              >
                <Text style={[styles.repairConditionText, repairCondition === 'Good' && styles.repairConditionTextActive]}>Good</Text>
              </Pressable>
              <Pressable
                onPress={() => setRepairCondition('Bad')}
                style={[styles.repairConditionBtn, repairCondition === 'Bad' && styles.repairConditionBtnBad]}
              >
                <Text style={[styles.repairConditionText, repairCondition === 'Bad' && styles.repairConditionTextActive]}>Bad</Text>
              </Pressable>
            </View>

            <Text style={styles.repairLabel}>Foto Terbaru</Text>
            <Pressable style={styles.pickBtn} onPress={pickRepairPhoto} disabled={repairing}>
              <Text style={styles.pickText}>{repairPhoto?.uri ? 'Ganti Foto' : 'Pilih Foto'}</Text>
            </Pressable>
            {repairPhoto?.uri ? <Image source={{ uri: repairPhoto.uri }} style={styles.repairPreview} resizeMode="cover" /> : null}

            <View style={styles.repairActions}>
              <Pressable style={[styles.secondaryActionBtn, repairing && styles.btnDisabled]} onPress={() => setRepairOpen(false)} disabled={repairing}>
                <Text style={styles.secondaryActionText}>Batal</Text>
              </Pressable>
              <Pressable style={[styles.primaryActionBtn, repairing && styles.btnDisabled]} onPress={submitRepair} disabled={repairing}>
                <Text style={styles.primaryActionText}>{repairing ? 'Menyimpan...' : 'Submit'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  title: { fontSize: 22, color: '#2A3547', textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
  addBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  secondaryText: { fontWeight: '900', color: '#0E5E7E' },
  input: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  filterLabel: { marginBottom: 6, color: '#6b7280', fontSize: 12, fontWeight: '800' },
  subCatScroll: { flexDirection: 'row', paddingVertical: 4, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(42,53,71,0.12)',
    backgroundColor: '#fff',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  chipActive: { backgroundColor: '#0E5E7E', borderColor: '#0E5E7E' },
  chipGoodActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipBadActive: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  chipText: { color: '#6b7280', fontSize: 13, fontWeight: '700', lineHeight: 16 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '900' },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  cardBad: { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', opacity: 0.78 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: 'rgba(42,53,71,0.06)' },
  thumbPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,53,71,0.06)',
  },
  info: { flex: 1, marginLeft: 12 },
  conditionPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
  conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  conditionText: { fontSize: 12, fontWeight: '900' },
  conditionTextGood: { color: '#16a34a' },
  conditionTextBad: { color: '#ef4444' },
  toolActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLinkText: { fontSize: 12, color: '#0E5E7E', fontWeight: '700' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,53,71,0.04)' },
  badActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 },
  repairBtn: { backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  repairText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  deleteBtn: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  deleteText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  btnDisabled: { opacity: 0.7 },
  rowTitle: { color: '#111827', fontFamily: 'Roboto_700Bold' },
  meta: { marginTop: 4, color: '#6b7280', fontFamily: 'Roboto_400Regular' },
  meta2: { marginTop: 2, color: '#9ca3af', fontFamily: 'Roboto_400Regular' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
  repairOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  repairCard: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  repairTitle: { fontSize: 18, fontWeight: '900', color: '#111827' },
  repairMeta: { marginTop: 6, color: '#6b7280', fontWeight: '700' },
  repairLabel: { marginTop: 14, marginBottom: 8, color: '#6b7280', fontSize: 12, fontWeight: '900' },
  repairConditionRow: { flexDirection: 'row', gap: 8 },
  repairConditionBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  repairConditionBtnGood: { borderColor: '#16a34a', backgroundColor: 'rgba(34,197,94,0.10)' },
  repairConditionBtnBad: { borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.10)' },
  repairConditionText: { color: '#6b7280', fontWeight: '900' },
  repairConditionTextActive: { color: '#111827' },
  pickBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  pickText: { color: '#fff', fontWeight: '900' },
  repairPreview: { marginTop: 10, width: '100%', height: 160, borderRadius: 12, backgroundColor: 'rgba(42,53,71,0.06)' },
  repairActions: { marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  secondaryActionBtn: { backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  secondaryActionText: { color: '#111827', fontWeight: '900' },
  primaryActionBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  primaryActionText: { color: '#fff', fontWeight: '900' },
});
