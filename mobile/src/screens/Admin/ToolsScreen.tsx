import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Tool } from '../../types';

type Props = {
  token: string;
  onCreate: () => void;
  onEdit: (toolId: string) => void;
  onOpenCategories: () => void;
  onOpenSubCategories: () => void;
};

export default function AdminToolsScreen({ token, onCreate, onEdit, onOpenCategories, onOpenSubCategories }: Props) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const q = search.trim();
    const url = q ? `/api/mobile/tools?search=${encodeURIComponent(q)}` : '/api/mobile/tools';
    const data = await apiRequest<Tool[]>(url, { token });
    setTools(data);
  }, [token, search]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Tools</Text>
        <Pressable onPress={onCreate} style={styles.addBtn}>
          <Text style={styles.addText}>Tambah</Text>
        </Pressable>
      </View>
      <View style={styles.actionsRow}>
        <Pressable onPress={onOpenCategories} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Kategori</Text>
        </Pressable>
        <Pressable onPress={onOpenSubCategories} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Sub Kategori</Text>
        </Pressable>
      </View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Cari nama atau kode" style={styles.input} />
      <FlatList
        data={tools}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada data</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onEdit(item._id)}>
            <Text style={styles.rowTitle}>
              {item.toolCode} - {item.name}
            </Text>
            <Text style={styles.meta}>
              {item.category} • {item.subCategory} • {item.condition || '-'}
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
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  secondaryText: { fontWeight: '900', color: '#0E5E7E' },
  input: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12, backgroundColor: '#fff', marginBottom: 12 },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  rowTitle: { fontWeight: '800', color: '#111827' },
  meta: { marginTop: 6, color: '#6b7280' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
});
