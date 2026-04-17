import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Loan } from '../../types';

type Props = {
  token: string;
  toolId: string;
};

export default function AdminToolLoansScreen({ token, toolId }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // We assume the API can filter by toolId, otherwise we fetch all and filter
    const data = await apiRequest<Loan[]>(`/api/mobile/loans?toolId=${toolId}`, { token });
    setLoans(data);
  }, [token, toolId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
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

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Belum ada riwayat peminjaman</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.rowTitle}>{item.borrowerName}</Text>
            <Text style={styles.meta}>
              {new Date(item.borrowedAt).toLocaleString()} • {item.status}
            </Text>
            <View style={styles.items}>
              {item.items.filter(x => x.toolId === toolId).map((it, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Text style={styles.itemText}>
                    {it.returnedAt ? `Dikembalikan: ${new Date(it.returnedAt).toLocaleString()}` : 'Belum dikembalikan'}
                  </Text>
                  {it.returnCondition && (
                    <Text style={styles.itemSubText}>Kondisi: {it.returnCondition}</Text>
                  )}
                  {it.returnDescription && (
                    <Text style={styles.itemSubText}>Ket: {it.returnDescription}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  rowTitle: { fontWeight: '800', color: '#111827', fontSize: 16 },
  meta: { marginTop: 4, color: '#6b7280', fontSize: 13 },
  items: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 8 },
  itemRow: { marginBottom: 4 },
  itemText: { fontSize: 14, color: '#374151', fontWeight: '600' },
  itemSubText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});
