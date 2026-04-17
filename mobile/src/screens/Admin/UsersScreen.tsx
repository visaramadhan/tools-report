import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faUser, faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons';
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

  const remove = async (u: User & { _id?: string }) => {
    Alert.alert('Hapus User', `Hapus user ini?\n${u.name}\n${u.email}`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/api/mobile/users/${u.id}`, { method: 'DELETE', token });
            await load();
          } catch (e: any) {
            Alert.alert('Gagal', e?.message || 'Gagal menghapus');
          }
        },
      },
    ]);
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
          <View style={styles.card}>
            <Pressable style={styles.row} onPress={() => onEdit(item.id)}>
              <View style={styles.avatar}>
                <FontAwesomeIcon icon={faUser} size={18} color="#0E5E7E" />
              </View>
              <View style={styles.info}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={styles.meta2} numberOfLines={1}>
                  {item.role} • {item.status ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </Pressable>
            <View style={styles.actions}>
              <Pressable style={styles.iconBtn} onPress={() => onEdit(item.id)}>
                <FontAwesomeIcon icon={faPenToSquare} size={18} color="#0E5E7E" />
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => remove(item)}>
                <FontAwesomeIcon icon={faTrash} size={18} color="#ef4444" />
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, marginBottom: 12 },
  title: { fontSize: 22, color: '#2A3547', textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
  addBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '900' },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2, flexDirection: 'row', alignItems: 'center' },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#E6F4FE', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 10 },
  iconBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(42,53,71,0.04)' },
  rowTitle: { color: '#111827', fontFamily: 'Roboto_700Bold' },
  meta: { marginTop: 6, color: '#6b7280', fontFamily: 'Roboto_400Regular' },
  meta2: { marginTop: 2, color: '#9ca3af', fontFamily: 'Roboto_400Regular' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});
