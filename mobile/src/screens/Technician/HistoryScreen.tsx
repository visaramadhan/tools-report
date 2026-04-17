import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, View, Image, ScrollView, Modal, Pressable } from 'react-native';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { apiRequest, getApiBaseUrlForDisplay } from '../../api/client';
import { Report } from '../../types';
import { useAppTheme } from '../../theme';
import { exportReportsPdfWeb } from '../../utils/pdfExport';

type Props = {
  token: string;
};

export default function HistoryScreen({ token }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const [dateFilterMode, setDateFilterMode] = useState<'day' | 'month'>('day');
  const [startDay, setStartDay] = useState('');
  const [endDay, setEndDay] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');

  const load = useCallback(async () => {
    const data = await apiRequest<Report[]>('/api/mobile/reports', { token });
    setReports(data);
  }, [token]);

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
  }, [dateFilterMode, endDay, endMonth, reports, startDay, startMonth]);

  const exportPdf = useCallback(async (mode: 'all' | 'filtered') => {
    const notify = (title: string, message: string) => {
      if (Platform.OS === 'web') {
        try {
          if (typeof window !== 'undefined') window.alert(`${title}\n${message}`);
        } catch {}
        return;
      }
      Alert.alert(title, message);
    };

    if (Platform.OS !== 'web') {
      notify('Info', 'Export PDF saat ini hanya tersedia di versi Web (Chrome).');
      return;
    }
    if (exportingPdf) return;
    const source = mode === 'all' ? reports : filteredReports;
    if (source.length === 0) {
      notify('Info', 'Tidak ada data laporan sesuai filter.');
      return;
    }
    setExportingPdf(true);
    try {
      const suffix = mode === 'filtered'
        ? (dateFilterMode === 'day' ? `day_${startDay || 'all'}_${endDay || 'all'}` : `month_${startMonth || 'all'}_${endMonth || 'all'}`)
        : 'all';
      const fileName = `Enerflex_Asset_Riwayat_Report_${suffix}.pdf`;
      exportReportsPdfWeb({
        title: 'Enerflex Asset',
        subtitle: mode === 'filtered' ? 'Riwayat Report (Filter)' : 'Riwayat Report (Semua)',
        fileName,
        reports: source,
      });
    } catch (e: any) {
      notify('Gagal', e?.message || 'Gagal export PDF');
    } finally {
      setExportingPdf(false);
    }
  }, [dateFilterMode, endDay, endMonth, exportingPdf, filteredReports, reports, startDay, startMonth]);

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
        <Text style={styles.title}>Riwayat Report</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.exportBtn, exportingPdf && styles.exportBtnDisabled]}
            onPress={() => exportPdf('filtered')}
            disabled={exportingPdf}
          >
            <Text style={styles.exportText}>{exportingPdf ? 'Mengekspor...' : 'Export Filter'}</Text>
          </Pressable>
          <Pressable
            style={[styles.exportBtn, styles.exportBtnSecondary, exportingPdf && styles.exportBtnDisabled]}
            onPress={() => exportPdf('all')}
            disabled={exportingPdf}
          >
            <Text style={styles.exportText}>{exportingPdf ? 'Mengekspor...' : 'Export Semua'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeBtn, dateFilterMode === 'day' && styles.modeBtnActive]} onPress={() => setDateFilterMode('day')}>
            <Text style={[styles.modeText, dateFilterMode === 'day' && styles.modeTextActive]}>Filter Hari</Text>
          </Pressable>
          <Pressable style={[styles.modeBtn, dateFilterMode === 'month' && styles.modeBtnActive]} onPress={() => setDateFilterMode('month')}>
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
                  <option value="">Dari Bulan (Semua)</option>
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
                  <option value="">Sampai Bulan (Semua)</option>
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
      </View>

      <FlatList
        data={filteredReports}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada report sesuai filter</Text>}
        renderItem={({ item }) => {
          const reportPhotos = item.photoUrls && item.photoUrls.length > 0 ? item.photoUrls : (item.photoUrl ? [item.photoUrl] : []);
          
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.rowTitle}>
                  {item.toolCode ? `${item.toolCode} - ` : ''}{item.toolName}
                </Text>
                <Pressable style={styles.detailBtn} onPress={() => navigation.navigate('ReportDetail', { report: item })}>
                  <Text style={styles.detailText}>Detail</Text>
                </Pressable>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                <View style={[styles.conditionPill, item.condition === 'Bad' ? styles.conditionBad : styles.conditionGood]}>
                  <Text style={[styles.conditionText, item.condition === 'Bad' ? styles.conditionTextBad : styles.conditionTextGood]}>
                    {item.condition}
                  </Text>
                </View>
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

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, flex: 1 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    exportBtn: { backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    exportBtnSecondary: { marginLeft: 8, backgroundColor: colors.primary },
    exportBtnDisabled: { opacity: 0.7 },
    exportText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    filterSection: { marginBottom: 12 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    modeBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 9, alignItems: 'center', backgroundColor: colors.card },
    modeBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
    modeText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    modeTextActive: { color: colors.primary },
    dateRow: { flexDirection: 'row', gap: 8 },
    searchInput: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 10, color: colors.text },
    dateInput: { flex: 1, marginBottom: 0 },
    list: { gap: 10, paddingBottom: 24 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
    rowTitle: { fontWeight: '800', color: colors.text },
    detailBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(14,94,126,0.14)', borderWidth: 1, borderColor: 'rgba(14,94,126,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
    detailText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
    meta: { marginTop: 6, color: colors.muted },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    conditionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
    conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
    conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
    conditionText: { fontSize: 12, fontWeight: '900' },
    conditionTextGood: { color: '#16a34a' },
    conditionTextBad: { color: colors.danger },
    desc: { marginTop: 8, color: colors.text },
    photoList: { marginTop: 12, flexDirection: 'row' },
    photoThumbContainer: { marginRight: 8 },
    thumbnail: { width: 80, height: 80, borderRadius: 8, backgroundColor: 'rgba(42,53,71,0.16)' },
    muted: { color: colors.muted, textAlign: 'center', marginTop: 30 },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
    fullImage: { width: '100%', height: '80%' },
  });
