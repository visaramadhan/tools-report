import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { apiRequest, getApiBaseUrlForDisplay } from '../../api/client';
import { Report } from '../../types';
import { useAppTheme } from '../../theme';
import { exportReportsPdfWeb } from '../../utils/pdfExport';

type Props = {
  token: string;
  onCreateReport: () => void;
};

export default function AdminReportsScreen({ token, onCreateReport }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<'Good' | 'Bad' | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [dateFilterMode, setDateFilterMode] = useState<'day' | 'month'>('day');
  const [startDay, setStartDay] = useState('');
  const [endDay, setEndDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const webControlStyle: any = useMemo(
    () => ({
      width: '100%',
      padding: 12,
      borderRadius: 12,
      border: `1px solid ${colors.border}`,
      backgroundColor: colors.inputBg,
      fontSize: 14,
      fontFamily: 'Roboto, system-ui, -apple-system, Segoe UI, Arial',
      color: colors.text,
      outline: 'none',
      boxSizing: 'border-box',
    }),
    [colors.border, colors.inputBg, colors.text],
  );

  const loadReports = useCallback(async () => {
    const data = await apiRequest<Report[]>('/api/mobile/reports', { token });
    setReports(data);
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const baseUrl = await getApiBaseUrlForDisplay();
        setApiBaseUrl(baseUrl);
        await loadReports();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadReports]);

  useFocusEffect(
    useCallback(() => {
      loadReports().catch(() => undefined);
    }, [loadReports])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadReports();
    } finally {
      setRefreshing(false);
    }
  };

  const categories = useMemo(
    () =>
      Array.from(new Set(reports.map((r) => String(r.category || '').trim()).filter((v) => v))).sort((a, b) =>
        a.localeCompare(b, 'id'),
      ),
    [reports],
  );

  const subCategoryOptions = useMemo(() => {
    let list = reports;
    if (selectedCategory) {
      list = list.filter((r) => String(r.category || '').trim() === selectedCategory);
    }
    return Array.from(new Set(list.map((r) => String(r.subCategory || '').trim()).filter((v) => v))).sort((a, b) =>
      a.localeCompare(b, 'id'),
    );
  }, [reports, selectedCategory]);

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

  const filteredReports = useMemo(() => {
    let result = [...reports];

    if (search.trim()) {
      const keyword = search.trim().toLowerCase();
      result = result.filter((r) => {
        const toolName = String(r.toolName || '').toLowerCase();
        const toolCode = String(r.toolCode || '').toLowerCase();
        const tech = String(r.technicianName || '').toLowerCase();
        const category = String(r.category || '').toLowerCase();
        const subCategory = String(r.subCategory || '').toLowerCase();
        return toolName.includes(keyword) || toolCode.includes(keyword) || tech.includes(keyword) || category.includes(keyword) || subCategory.includes(keyword);
      });
    }

    if (selectedCategory) {
      result = result.filter((r) => String(r.category || '').trim() === selectedCategory);
    }

    if (selectedSubCategory) {
      result = result.filter((r) => String(r.subCategory || '').trim() === selectedSubCategory);
    }

    if (selectedCondition) {
      result = result.filter((r) => r.condition === selectedCondition);
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

    return result;
  }, [reports, search, selectedCategory, selectedSubCategory, selectedCondition, dateFilterMode, startDay, endDay, startMonth, endMonth]);

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
        await loadReports();
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
  }, [loadReports, selectedIds, token]);

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
      const safe = (s: string) => s.replace(/[^\w-]+/g, '_');
      const suffixParts: string[] = [];
      if (mode === 'filtered') {
        if (dateFilterMode === 'day') suffixParts.push(`day_${startDay || 'all'}_${endDay || 'all'}`);
        else suffixParts.push(`month_${startMonth || 'all'}_${endMonth || 'all'}`);
        if (selectedCategory) suffixParts.push(`cat_${safe(selectedCategory)}`);
        if (selectedSubCategory) suffixParts.push(`sub_${safe(selectedSubCategory)}`);
        if (selectedCondition) suffixParts.push(`cond_${safe(selectedCondition)}`);
      } else {
        suffixParts.push('all');
      }
      const fileName = `Enerflex_Asset_Riwayat_Report_${suffixParts.join('__')}.pdf`;
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
  }, [dateFilterMode, endDay, endMonth, exportingPdf, filteredReports, reports, selectedCategory, selectedSubCategory, startDay, startMonth]);

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
        <Text style={styles.title}>Reports</Text>
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
            <Pressable style={styles.addBtn} onPress={onCreateReport}>
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
          placeholder="Cari tools, teknisi, kategori..."
          style={styles.searchInput}
          placeholderTextColor={colors.muted}
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
              <TextInput value={startDay} onChangeText={setStartDay} placeholder="Dari (YYYY-MM-DD)" style={[styles.searchInput, styles.dateInput]} placeholderTextColor={colors.muted} />
            )}
            {Platform.OS === 'web' ? (
              <View style={styles.dateInput}>
                <input type="date" value={endDay} onChange={(e: any) => setEndDay(String(e?.target?.value || ''))} style={webControlStyle} />
              </View>
            ) : (
              <TextInput value={endDay} onChangeText={setEndDay} placeholder="Sampai (YYYY-MM-DD)" style={[styles.searchInput, styles.dateInput]} placeholderTextColor={colors.muted} />
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
              <TextInput value={startMonth} onChangeText={setStartMonth} placeholder="Dari (YYYY-MM)" style={[styles.searchInput, styles.dateInput]} placeholderTextColor={colors.muted} />
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
              <TextInput value={endMonth} onChangeText={setEndMonth} placeholder="Sampai (YYYY-MM)" style={[styles.searchInput, styles.dateInput]} placeholderTextColor={colors.muted} />
            )}
          </View>
        )}

        <Text style={styles.filterLabel}>Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCatScroll}>
          <Pressable
            style={[styles.chip, !selectedCategory && styles.chipActive]}
            onPress={() => {
              setSelectedCategory(null);
              setSelectedSubCategory(null);
            }}
          >
            <Text style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>Semua</Text>
          </Pressable>
          {categories.map((c) => (
            <Pressable
              key={c}
              style={[styles.chip, selectedCategory === c && styles.chipActive]}
              onPress={() => {
                setSelectedCategory(c);
                setSelectedSubCategory(null);
              }}
            >
              <Text style={[styles.chipText, selectedCategory === c && styles.chipTextActive]}>
                {c}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.filterLabel}>Sub Kategori</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subCatScroll}>
          <Pressable
            style={[styles.chip, !selectedSubCategory && styles.chipActive]}
            onPress={() => setSelectedSubCategory(null)}
          >
            <Text style={[styles.chipText, !selectedSubCategory && styles.chipTextActive]}>Semua</Text>
          </Pressable>
          {subCategoryOptions.map((sub) => (
            <Pressable
              key={sub}
              style={[styles.chip, selectedSubCategory === sub && styles.chipActive]}
              onPress={() => setSelectedSubCategory(sub)}
            >
              <Text style={[styles.chipText, selectedSubCategory === sub && styles.chipTextActive]}>
                {sub}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

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
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada report sesuai filter</Text>}
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
                  <Text style={styles.rowTitle}>
                    {item.toolCode ? `${item.toolCode} - ` : ''}{item.toolName}
                  </Text>
                  <Text style={styles.meta}>Pelapor: {item.technicianName}</Text>
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

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  title: { fontSize: 22, color: colors.text, textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold', flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  addText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  smallBtn: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  smallBtnDanger: { borderColor: 'rgba(239,68,68,0.35)', backgroundColor: 'rgba(239,68,68,0.06)' },
  smallBtnDisabled: { opacity: 0.6 },
  smallBtnText: { fontSize: 12, fontWeight: '900', color: colors.primary },
  smallBtnTextDanger: { color: colors.danger },
  exportBar: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  exportBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnSecondary: { backgroundColor: colors.primary },
  exportBtnDisabled: { opacity: 0.7 },
  exportText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  conditionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
  conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  conditionText: { fontSize: 12, fontWeight: '900' },
  conditionTextGood: { color: '#16a34a' },
  conditionTextBad: { color: colors.danger },
  filterSection: { marginBottom: 16 },
  filterLabel: { marginTop: 8, marginBottom: 6, color: colors.muted, fontSize: 12, fontWeight: '800' },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  modeBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
  modeText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
  modeTextActive: { color: colors.primary },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  searchInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    fontFamily: 'Roboto_400Regular',
    color: colors.text,
  },
  dateInput: { flex: 1, marginBottom: 0 },
  subCatScroll: { flexDirection: 'row', paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipGoodActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  chipBadActive: { backgroundColor: colors.danger, borderColor: colors.danger },
  chipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  chipTextActive: {
    color: '#fff',
  },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardInfo: { flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, marginTop: 2, marginRight: 10 },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  detailBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(14,94,126,0.14)', borderWidth: 1, borderColor: 'rgba(14,94,126,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 10 },
  detailText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  rowTitle: { fontWeight: '800', color: colors.text, fontFamily: 'Roboto_700Bold' },
  meta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  desc: { marginTop: 8, color: colors.text, fontSize: 14, lineHeight: 20 },
  photoList: { marginTop: 12, flexDirection: 'row' },
  photoThumbContainer: { marginRight: 8 },
  thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: 'rgba(42,53,71,0.16)' },
  muted: { color: colors.muted, textAlign: 'center', marginTop: 30 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
  fullImage: { width: '100%', height: '80%' },
});
