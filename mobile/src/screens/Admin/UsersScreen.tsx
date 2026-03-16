import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { User } from '../../types';

type Props = {
  token: string;
  onCreate: () => void;
  onEdit: (userId: string) => void;
};

export default function AdminUsersScreen({ token, onCreate, onEdit }: Props) {
  const [users, setUsers] = useState<Array<User & { _id?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await apiRequest<Array<{ _id: string; name: string; email: string; role: 'admin' | 'technician'; status: boolean }>>(
      '/api/mobile/users',
      { token }
    );
    setUsers(
      data.map((u) => ({
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
      }))
    );
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat user');
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
      <View style={styles.header}>
        <Text style={styles.title}>Users</Text>
        <Pressable onPress={onCreate} style={styles.addBtn}>
          <Text style={styles.addText}>Tambah</Text>
        </Pressable>
      </View>
      <FlatList
        data={users}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada user</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onEdit(item.id)}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            <Text style={styles.meta}>{item.email}</Text>
            <Text style={styles.meta}>
              {item.role} • {item.status ? 'Active' : 'Inactive'}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#2A3547' },
  addBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '900' },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  rowTitle: { fontWeight: '800', color: '#111827' },
  meta: { marginTop: 6, color: '#6b7280' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});

