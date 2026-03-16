import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Replacement, Tool } from '../../types';

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
  const [tools, setTools] = useState<Tool[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [t, r] = await Promise.all([
      apiRequest<Tool[]>('/api/mobile/tools/mine', { token }),
      apiRequest<Replacement[]>('/api/mobile/replacements', { token }),
    ]);
    setTools(t);
    setReplacements(r.filter((x) => x.status !== 'Completed' && x.status !== 'Rejected'));
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools Saya</Text>
        <Pressable onPress={onLogout}>
          <Text style={styles.link}>Logout</Text>
        </Pressable>
      </View>

      <FlatList
        data={[{ key: 'tools' }, { key: 'replacements' }] as const}
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
                  tools.map((t) => (
                    <Pressable key={t._id} style={styles.row} onPress={() => onOpenReport(t)}>
                      <Text style={styles.code}>{t.toolCode}</Text>
                      <Text style={styles.rowText}>{t.name}</Text>
                    </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: { padding: 16, paddingTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#2A3547' },
  link: { color: '#0E5E7E', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#2A3547' },
  muted: { marginTop: 6, color: '#6b7280' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.06)' },
  code: { fontFamily: 'monospace', backgroundColor: 'rgba(42,53,71,0.06)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginRight: 10, color: '#2A3547', fontWeight: '700' },
  rowText: { color: '#111827', fontWeight: '700', flex: 1 },
  repl: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.06)', gap: 6 },
  replTitle: { fontWeight: '800', color: '#111827' },
  replSub: { fontWeight: '700', color: '#374151' },
  button: { marginTop: 8, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800' },
});
