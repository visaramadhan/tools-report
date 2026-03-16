import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Loan } from '../../types';

type Props = {
  token: string;
  onOpenLoan: (loan: Loan) => void;
};

export default function AdminLoansScreen({ token, onOpenLoan }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await apiRequest<Loan[]>('/api/mobile/loans', { token });
    setLoans(data.filter((l) => l.status !== 'Returned'));
  }, [token]);

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
      <Text style={styles.title}>Loans</Text>
      <FlatList
        data={loans}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada loan aktif</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenLoan(item)}>
            <Text style={styles.rowTitle}>{item.borrowerName}</Text>
            <Text style={styles.meta}>
              {new Date(item.borrowedAt).toLocaleString()} • {item.status} • {item.items.filter((x) => !x.returnedAt).length} item belum kembali
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#2A3547', marginTop: 6, marginBottom: 12 },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  rowTitle: { fontWeight: '800', color: '#111827' },
  meta: { marginTop: 6, color: '#6b7280' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});

