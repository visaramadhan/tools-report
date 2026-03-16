import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Replacement } from '../../types';

type Props = {
  token: string;
  onOpenReplacement: (r: Replacement) => void;
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

export default function AdminReplacementsScreen({ token, onOpenReplacement }: Props) {
  const [items, setItems] = useState<Replacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await apiRequest<Replacement[]>('/api/mobile/replacements', { token });
    setItems(data);
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
      <Text style={styles.title}>Penggantian</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Belum ada penggantian</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenReplacement(item)}>
            <Text style={styles.rowTitle}>
              {item.oldToolCode} - {item.oldToolName}
            </Text>
            <Text style={styles.meta}>{statusText(item.status)}</Text>
            {item.newToolCode ? (
              <Text style={styles.meta}>
                Baru: {item.newToolCode} - {item.newToolName}
              </Text>
            ) : null}
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

