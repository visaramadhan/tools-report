import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Report } from '../../types';

type Props = {
  token: string;
};

export default function AdminReportsScreen({ token }: Props) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await apiRequest<Report[]>('/api/mobile/reports', { token });
    setReports(data);
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
      <Text style={styles.title}>Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Belum ada report</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.rowTitle}>
              {item.toolCode ? `${item.toolCode} - ` : ''}{item.toolName}
            </Text>
            <Text style={styles.meta}>{item.technicianName}</Text>
            <Text style={styles.meta}>
              {new Date(item.createdAt).toLocaleString()} • {item.condition}
            </Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </View>
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
  desc: { marginTop: 8, color: '#374151' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});

