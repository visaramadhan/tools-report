import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, View, Pressable, Image, ScrollView, Modal } from 'react-native';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { apiRequest, getApiBaseUrlForDisplay } from '../../api/client';
import { Report, Tool } from '../../types';
import { exportReportsPdfWeb } from '../../utils/pdfExport';

type Props = {
  token: string;
  toolId: string;
  onCreateReport: () => void;
};

export default function AdminToolReportsScreen({ token, toolId, onCreateReport }: Props) {
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<'Good' | 'Bad' | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [dateFilterMode, setDateFilterMode] = useState<'day' | 'month'>('day');
  const [startDay, setStartDay] = useState('');
  const [endDay, setEndDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const webControlStyle: any = useMemo(
    () => ({
      width: '100%',
      padding: 12,
      borderRadius: 12,
      border: '1px solid rgba(42,53,71,0.12)',
      backgroundColor: '#fff',
      fontSize: 14,
      fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, Arial',
      color: '#111827',
      outline: 'none',
      boxSizing: 'border-box',
    }),
    [],
  );

  const load = useCallback(async () => {
    // We assume the API can filter by toolId
    const [data, t] = await Promise.all([
      apiRequest<Report[]>(`/api/mobile/reports?toolId=${toolId}`, { token }),
      apiRequest<Tool>(`/api/mobile/tools/${toolId}`, { token }),
    ]);
    setReports(data);
    setTool(t);
  }, [token, toolId]);

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

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const isToolInactive = useMemo(() => {
    if (!tool) return false;
    return tool.status === false || (tool.condition || 'Good') === 'Bad';
  }, [tool]);

  const filteredReports = useMemo(() => {
    let result = [...reports];
    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter((r) => {
        const tech = String(r.technicianName || '').toLowerCase();
        const examiner = String(r.examinerName || '').toLowerCase();
        const desc = String(r.description || '').toLowerCase();
        const cond = String(r.condition || '').toLowerCase();
        return tech.includes(keyword) || examiner.includes(keyword) || desc.includes(keyword) || cond.includes(keyword);
      });
    }

    if (dateFilterMode === 'day') {
      const start = startDay ? new Date(`${startDay}T00:00:00`).getTime() : null;
      const end = endDay ? new Date(`${endDay}T23:59:59`).getTime() : null;
      result = result.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        if (start !== null && t < start) return false;
        if (end !== null && t > end) return false;
        return true;
      });
    } else {
      const start = startMonth ? new Date(`${startMonth}-01T00:00:00`).getTime() : null;
      const end = endMonth
        ? new Date(new Date(`${endMonth}-01T00:00:00`).getFullYear(), new Date(`${endMonth}-01T00:00:00`).getMonth() + 1, 0, 23, 59, 59).getTime()
        : null;
      result = result.filter((r) => {
        const t = new Date(r.createdAt).getTime();
        if (start !== null && t < start) return false;
        if (end !== null && t > end) return false;
        return true;
      });
    }

    if (selectedCondition) {
      result = result.filter((r) => r.condition === selectedCondition);
    }
    return result;
  }, [reports, search, dateFilterMode, startDay, endDay, startMonth, endMonth, selectedCondition]);

  const allFilteredSelected = useMemo(() => {
    if (!filteredReports.length) return false;
    return filteredReports.every((r) => selectedIds[r._id]);
  }, [filteredReports, selectedIds]);

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const toggleSelectAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const r of filteredReports) next[r._id] = true;
    setSelectedIds(next);
  }, [allFilteredSelected, filteredReports]);

  const deleteSelected = useCallback(() => {
    const ids = Object.entries(selectedIds)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (ids.length === 0) return;
    const doDelete = async () => {
      try {
        await apiRequest(`/api/mobile/reports`, {
          method: 'DELETE',
          token,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });
        setSelectedIds({});
        setSelectMode(false);
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal menghapus report');
      }
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' ? window.confirm(`Hapus ${ids.length} report?`) : true;
      if (!ok) return;
      doDelete().catch(() => undefined);
      return;
    }

    Alert.alert('Konfirmasi', `Hapus ${ids.length} report?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: () => doDelete().catch(() => undefined) },
    ]);
  }, [load, selectedIds, token]);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    for (const r of reports) {
      const d = new Date(r.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1).padStart(2, '0');
      months.add(`${y}-${m}`);
    }
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [reports]);

  const exportPdf = useCallback(async (mode: 'all' | 'filtered') => {
    if (Platform.OS !== 'web') {
      Alert.alert('Info', 'Export PDF saat ini hanya tersedia di versi Web (Chrome).');
      return;
    }
    if (exportingPdf) return;
    const source = mode === 'all' ? reports : filteredReports;
    if (source.length === 0) {
      Alert.alert('Info', 'Tidak ada data laporan sesuai filter.');
      return;
    }
    setExportingPdf(true);
    try {
      const suffix = mode === 'filtered'
        ? (dateFilterMode === 'day' ? `day_${startDay || 'all'}_${endDay || 'all'}` : `month_${startMonth || 'all'}_${endMonth || 'all'}`)
        : 'all';
      const fileName = `Enerflex_Asset_Riwayat_Report_Tool_${String(toolId)}_${suffix}.pdf`;
      exportReportsPdfWeb({
        title: 'Enerflex Asset',
        subtitle: mode === 'filtered' ? 'Riwayat Report (Filter)' : 'Riwayat Report (Semua)',
        fileName,
        reports: source,
      });
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal export PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [dateFilterMode, endDay, endMonth, exportingPdf, filteredReports, reports, startDay, startMonth, toolId]);

  const renderPhoto = (url: string) => {
    if (!url) return null;
    let fullUrl = url;
    if (!url.startsWith('http')) {
      const base = apiBaseUrl ? (apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl) : 'http://localhost:3001';
      const path = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${base}${path}`;
    }
    
    return (
      <Pressable key={url} onPress={() => setPreviewPhoto(fullUrl)} style={styles.photoThumbContainer}>
        <Image 
          source={{ uri: fullUrl }} 
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daftar Laporan</Text>
        {selectMode ? (
          <View style={styles.headerActions}>
            <Pressable style={styles.smallBtn} onPress={toggleSelectAll}>
              <Text style={styles.smallBtnText}>{allFilteredSelected ? 'Unselect' : 'Select All'}</Text>
            </Pressable>
            <Pressable
              style={[styles.smallBtn, styles.smallBtnDanger, selectedCount === 0 && styles.smallBtnDisabled]}
              onPress={deleteSelected}
              disabled={selectedCount === 0}
            >
              <Text style={[styles.smallBtnText, styles.smallBtnTextDanger]}>Hapus ({selectedCount})</Text>
            </Pressable>
            <Pressable
              style={styles.smallBtn}
              onPress={() => {
                setSelectMode(false);
                setSelectedIds({});
              }}
            >
              <Text style={styles.smallBtnText}>Batal</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.headerActions}>
            <Pressable style={styles.smallBtn} onPress={() => setSelectMode(true)}>
              <Text style={styles.smallBtnText}>Pilih</Text>
            </Pressable>
            <Pressable
              style={[styles.addBtn, isToolInactive && styles.addBtnDisabled]}
              onPress={() => {
                if (isToolInactive) {
                  Alert.alert('Info', 'Tools berstatus BAD / tidak aktif. Tidak bisa dibuat laporan lagi sebelum diperbaiki.');
                  return;
                }
                onCreateReport();
              }}
            >
              <FontAwesomeIcon icon={faPlus} color="#fff" size={12} />
              <Text style={styles.addText}>Buat</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.exportBar}>
        <Pressable style={[styles.exportBtn, exportingPdf && styles.exportBtnDisabled]} onPress={() => exportPdf('filtered')} disabled={exportingPdf}>
          <Text style={styles.exportText}>{exportingPdf ? 'Mengekspor...' : 'Export PDF (Filter)'}</Text>
        </Pressable>
        <Pressable style={[styles.exportBtn, styles.exportBtnSecondary, exportingPdf && styles.exportBtnDisabled]} onPress={() => exportPdf('all')} disabled={exportingPdf}>
          <Text style={styles.exportText}>{exportingPdf ? 'Mengekspor...' : 'Export PDF (Semua)'}</Text>
        </Pressable>
      </View>

      <View style={styles.filterSection}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari teknisi, kondisi, keterangan..."
          style={styles.searchInput}
        />
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, dateFilterMode === 'day' && styles.modeBtnActive]}
            onPress={() => setDateFilterMode('day')}
          >
            <Text style={[styles.modeText, dateFilterMode === 'day' && styles.modeTextActive]}>Filter Hari</Text>
          </Pressable>
          <Pressable
            style={[styles.modeBtn, dateFilterMode === 'month' && styles.modeBtnActive]}
            onPress={() => setDateFilterMode('month')}
          >
            <Text style={[styles.modeText, dateFilterMode === 'month' && styles.modeTextActive]}>Filter Bulan</Text>
          </Pressable>
        </View>
        {dateFilterMode === 'day' ? (
          <View style={styles.dateRow}>
            {Platform.OS === 'web' ? (
              <View style={styles.dateInput}>
                <input type="date" value={startDay} onChange={(e: any) => setStartDay(String(e?.target?.value || ''))} style={webControlStyle} />
              </View>
            ) : (
              <TextInput value={startDay} onChangeText={setStartDay} placeholder="Dari (YYYY-MM-DD)" style={[styles.searchInput, styles.dateInput]} />
            )}
            {Platform.OS === 'web' ? (
              <View style={styles.dateInput}>
                <input type="date" value={endDay} onChange={(e: any) => setEndDay(String(e?.target?.value || ''))} style={webControlStyle} />
              </View>
            ) : (
              <TextInput value={endDay} onChangeText={setEndDay} placeholder="Sampai (YYYY-MM-DD)" style={[styles.searchInput, styles.dateInput]} />
            )}
          </View>
        ) : (
          <View style={styles.dateRow}>
            {Platform.OS === 'web' ? (
              <View style={styles.dateInput}>
                <select value={startMonth} onChange={(e: any) => setStartMonth(String(e?.target?.value || ''))} style={webControlStyle}>
                  <option value="">Dari (Semua)</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </View>
            ) : (
              <TextInput value={startMonth} onChangeText={setStartMonth} placeholder="Dari (YYYY-MM)" style={[styles.searchInput, styles.dateInput]} />
            )}
            {Platform.OS === 'web' ? (
              <View style={styles.dateInput}>
                <select value={endMonth} onChange={(e: any) => setEndMonth(String(e?.target?.value || ''))} style={webControlStyle}>
                  <option value="">Sampai (Semua)</option>
                  {monthOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </View>
            ) : (
              <TextInput value={endMonth} onChangeText={setEndMonth} placeholder="Sampai (YYYY-MM)" style={[styles.searchInput, styles.dateInput]} />
            )}
          </View>
        )}

        <Text style={styles.filterLabel}>Kondisi</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCatScroll}>
          <Pressable style={[styles.chip, !selectedCondition && styles.chipActive]} onPress={() => setSelectedCondition(null)}>
            <Text style={[styles.chipText, !selectedCondition && styles.chipTextActive]}>Semua</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, selectedCondition === 'Good' && styles.chipGoodActive]}
            onPress={() => setSelectedCondition('Good')}
          >
            <Text style={[styles.chipText, selectedCondition === 'Good' && styles.chipTextActive]}>Good</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, selectedCondition === 'Bad' && styles.chipBadActive]}
            onPress={() => setSelectedCondition('Bad')}
          >
            <Text style={[styles.chipText, selectedCondition === 'Bad' && styles.chipTextActive]}>Bad</Text>
          </Pressable>
        </ScrollView>
      </View>
      <FlatList
        data={filteredReports}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada laporan sesuai filter</Text>}
        renderItem={({ item }) => {
          const reportPhotos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
          const checked = !!selectedIds[item._id];

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                {selectMode ? (
                  <Pressable
                    style={[styles.checkbox, checked && styles.checkboxOn]}
                    onPress={() => setSelectedIds((p) => ({ ...p, [item._id]: !p[item._id] }))}
                  />
                ) : null}
                <View style={styles.cardInfo}>
                  <Text style={styles.rowTitle}>{item.technicianName || 'Admin'}</Text>
                  {item.examinerName && item.examinerName !== item.technicianName ? (
                    <Text style={styles.meta}>Pemeriksa: {item.examinerName}</Text>
                  ) : null}
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>Waktu: {new Date(item.createdAt).toLocaleString()}</Text>
                    <View style={[styles.conditionPill, item.condition === 'Bad' ? styles.conditionBad : styles.conditionGood]}>
                      <Text style={[styles.conditionText, item.condition === 'Bad' ? styles.conditionTextBad : styles.conditionTextGood]}>
                        {item.condition}
                      </Text>
                    </View>
                  </View>
                </View>
                {!selectMode ? (
                  <Pressable style={styles.detailBtn} onPress={() => navigation.navigate('ReportDetail', { report: item, token, role: 'admin' })}>
                    <Text style={styles.detailText}>Detail</Text>
                  </Pressable>
                ) : null}
              </View>
              {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
              
              {reportPhotos.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                  {reportPhotos.map(renderPhoto)}
                </ScrollView>
              )}
            </View>
          );
        }}
      />

      <Modal visible={!!previewPhoto} transparent onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.modalBg}>
          <Pressable style={styles.closeBtn} onPress={() => setPreviewPhoto(null)}>
            <FontAwesomeIcon icon={faTimes} color="#fff" size={24} />
          </Pressable>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  conditionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
  conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  conditionText: { fontSize: 12, fontWeight: '900' },
  conditionTextGood: { color: '#16a34a' },
  conditionTextBad: { color: '#ef4444' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#2A3547', flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#0E5E7E', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addBtnDisabled: { opacity: 0.6 },
  addText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  smallBtn: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnDanger: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' },
  smallBtnDisabled: { opacity: 0.6 },
  smallBtnText: { fontSize: 12, fontWeight: '900', color: '#0E5E7E' },
  smallBtnTextDanger: { color: '#ef4444' },
  exportBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  exportBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnSecondary: { backgroundColor: '#0E5E7E' },
  exportBtnDisabled: { opacity: 0.7 },
  exportText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  filterSection: { marginBottom: 12 },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(42,53,71,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(42,53,71,0.12)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeBtnActive: { borderColor: '#0E5E7E', backgroundColor: 'rgba(14,94,126,0.08)' },
  modeText: { color: '#6b7280', fontWeight: '800', fontSize: 12 },
  modeTextActive: { color: '#0E5E7E' },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, marginBottom: 0 },
  filterLabel: { marginTop: 8, marginBottom: 6, color: '#6b7280', fontSize: 12, fontWeight: '800' },
  subCatScroll: { flexDirection: 'row', paddingVertical: 4 },
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
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: 'rgba(42,53,71,0.35)', marginTop: 2, marginRight: 10 },
  checkboxOn: { backgroundColor: '#0E5E7E', borderColor: '#0E5E7E' },
  detailBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(14,94,126,0.10)', borderWidth: 1, borderColor: 'rgba(14,94,126,0.25)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 10 },
  detailText: { color: '#0E5E7E', fontSize: 12, fontWeight: '900' },
  rowTitle: { fontWeight: '800', color: '#111827', fontSize: 16 },
  meta: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  desc: { marginTop: 10, color: '#374151', fontSize: 14, lineHeight: 20 },
  photoList: { marginTop: 12, flexDirection: 'row' },
  photoThumbContainer: { marginRight: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullImage: { width: '100%', height: '80%' },
});
