import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Replacement, Report, Tool } from '../../types';
import ShipReplacementModal from '../../components/ShipReplacementModal';

type Props = {
  token: string;
  replacement: Replacement;
  onDone: () => void;
};

function statusText(status: string) {
  if (status === 'Requested') return 'Menunggu review';
  if (status === 'Approved') return 'Akan dikirim';
  if (status === 'Shipped') return 'Dikirim';
  if (status === 'ReplacementReceived') return 'Diterima teknisi';
  if (status === 'OldToolInTransit') return 'Tools lama dikirim';
  if (status === 'OldReturned') return 'Tools lama diterima';
  if (status === 'Verified') return 'Verifikasi admin';
  if (status === 'Completed') return 'Selesai';
  if (status === 'Rejected') return 'Ditolak';
  return status;
}

export default function AdminReplacementDetailScreen({ token, replacement, onDone }: Props) {
  const [current, setCurrent] = useState<Replacement>(replacement);
  const [oldSubCategory, setOldSubCategory] = useState<string>('');
  const [requesterLabel, setRequesterLabel] = useState<string>('');
  const [shipOpen, setShipOpen] = useState(false);
  const [history, setHistory] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const [repls, hist, oldTool] = await Promise.all([
      apiRequest<Replacement[]>('/api/mobile/replacements', { token }),
      apiRequest<Report[]>(`/api/mobile/reports?toolId=${current.oldToolId}`, { token }),
      apiRequest<Tool>(`/api/mobile/tools/${current.oldToolId}`, { token }),
    ]);
    const found = repls.find((r) => r._id === current._id);
    if (found) setCurrent(found);
    setOldSubCategory(String(oldTool.subCategory || ''));
    setRequesterLabel(String(oldTool.currentBorrowerName || oldTool.currentBorrowerId || ''));
    setHistory(hist.slice(0, 5));
  }, [token, current._id, current.oldToolId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Penggantian</Text>
        <Text style={styles.meta}>Status: {statusText(current.status)}</Text>
        <Text style={styles.section}>Tools Lama</Text>
        <Text style={styles.value}>
          {current.oldToolCode} - {current.oldToolName}
        </Text>

        {current.newToolCode ? (
          <>
            <Text style={styles.section}>Tools Baru</Text>
            <Text style={styles.value}>
              {current.newToolCode} - {current.newToolName}
            </Text>
          </>
        ) : null}

        {requesterLabel ? <Text style={styles.meta}>Pemakai: {requesterLabel}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Riwayat Report (Tools Lama)</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Tidak ada riwayat</Text>
        ) : (
          history.map((r) => (
            <View key={r._id} style={styles.historyItem}>
              <View style={styles.historyRow}>
                <Text style={styles.historyTitle}>{new Date(r.createdAt).toLocaleString()}</Text>
                <View style={[styles.conditionPill, r.condition === 'Bad' ? styles.conditionBad : styles.conditionGood]}>
                  <Text style={[styles.conditionText, r.condition === 'Bad' ? styles.conditionTextBad : styles.conditionTextGood]}>
                    {r.condition}
                  </Text>
                </View>
              </View>
              {r.description ? <Text style={styles.muted}>{r.description}</Text> : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Aksi</Text>
        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={() => setShipOpen(true)} disabled={loading}>
          <Text style={styles.buttonText}>Kirim Pengganti</Text>
        </Pressable>
      </View>

      {oldSubCategory ? (
        <ShipReplacementModal
          token={token}
          visible={shipOpen}
          onClose={() => setShipOpen(false)}
          replacementId={current._id}
          subCategory={oldSubCategory}
          oldToolLabel={`${current.oldToolCode} - ${current.oldToolName}`}
          requesterLabel={requesterLabel || '-'}
          onSuccess={refresh}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A3547' },
  meta: { marginTop: 8, color: '#6b7280' },
  section: { marginTop: 12, fontWeight: '900', color: '#374151' },
  value: { marginTop: 6, fontWeight: '800', color: '#111827' },
  label: { marginTop: 10, fontWeight: '800', color: '#374151' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  button: { flexGrow: 1, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  buttonDisabled: { opacity: 0.7 },
  muted: { marginTop: 6, color: '#6b7280' },
  historyItem: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.06)' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  historyTitle: { fontWeight: '900', color: '#111827' },
  conditionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
  conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
  conditionText: { fontSize: 12, fontWeight: '900' },
  conditionTextGood: { color: '#16a34a' },
  conditionTextBad: { color: '#ef4444' },
});
