import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Loan, Tool } from '../../types';
import { useAppTheme } from '../../theme';

type Props = {
  token: string;
};

export default function LoansScreen({ token }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectedCount = useMemo(() => Object.values(selectedToolIds).filter(Boolean).length, [selectedToolIds]);

  const loadLoans = useCallback(async () => {
    const data = await apiRequest<Loan[]>('/api/mobile/loans', { token });
    setLoans(data);
  }, [token]);

  const loadTools = useCallback(
    async (q: string) => {
      setToolsLoading(true);
      try {
        const query = q.trim();
        const url = query
          ? `/api/mobile/tools?available=true&search=${encodeURIComponent(query)}`
          : '/api/mobile/tools?available=true';
        const data = await apiRequest<Tool[]>(url, { token });
        setTools(data);
      } finally {
        setToolsLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadLoans();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadLoans]);

  useEffect(() => {
    if (!creating) return;
    loadTools(search).catch(() => undefined);
  }, [creating, loadTools, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLoans();
    } finally {
      setRefreshing(false);
    }
  };

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const submit = async () => {
    const toolIds = Object.entries(selectedToolIds)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (toolIds.length === 0) {
      Alert.alert('Gagal', 'Pilih minimal 1 tools');
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest('/api/mobile/loans', {
        method: 'POST',
        token,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolIds }),
      });
      Alert.alert('Berhasil', 'Peminjaman berhasil dibuat');
      setSelectedToolIds({});
      setCreating(false);
      setSearch('');
      await loadLoans();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal membuat peminjaman');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Peminjaman</Text>
        <Pressable style={[styles.primaryBtn, submitting ? styles.btnDisabled : null]} onPress={() => (creating ? submit() : setCreating(true))} disabled={submitting}>
          <Text style={styles.primaryText}>{creating ? `Simpan (${selectedCount})` : 'Tambah'}</Text>
        </Pressable>
      </View>

      {creating ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pilih Tools</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari kode / nama tools..."
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor={colors.muted}
          />
          <FlatList
            data={tools}
            keyExtractor={(i) => i._id}
            contentContainerStyle={styles.toolsList}
            ListEmptyComponent={toolsLoading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada tools tersedia</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.toolRow} onPress={() => toggleTool(item._id)}>
                <View style={[styles.checkbox, selectedToolIds[item._id] ? styles.checkboxOn : null]} />
                <View style={styles.toolInfo}>
                  <Text style={styles.toolCode}>{item.toolCode}</Text>
                  <Text style={styles.toolName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.toolMeta} numberOfLines={1}>
                    {item.category} • {item.subCategory}
                  </Text>
                </View>
              </Pressable>
            )}
          />
          <Pressable style={styles.secondaryBtn} onPress={() => setCreating(false)} disabled={submitting}>
            <Text style={styles.secondaryText}>Batal</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={loans}
        keyExtractor={(i) => i._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Belum ada peminjaman</Text>}
        renderItem={({ item }) => {
          const activeItems = item.items.filter((it) => !it.returnedAt && it.status !== 'Exchanged');
          return (
            <View style={styles.card}>
              <Text style={styles.rowTitle}>{item.status}</Text>
              <Text style={styles.meta}>
                {new Date(item.borrowedAt).toLocaleString()} • {activeItems.length} item aktif
              </Text>
              {activeItems.slice(0, 3).map((it) => (
                <Text key={it.toolId} style={styles.itemRow} numberOfLines={1}>
                  {it.toolCode} - {it.toolName}
                </Text>
              ))}
              {activeItems.length > 3 ? <Text style={styles.more}>+{activeItems.length - 3} item</Text> : null}
            </View>
          );
        }}
      />
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 12, gap: 10 },
    title: { fontSize: 22, color: colors.text, textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
    primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    btnDisabled: { opacity: 0.6 },
    primaryText: { color: '#fff', fontFamily: 'Roboto_700Bold' },
    secondaryBtn: { marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.card },
    secondaryText: { color: colors.primary, fontFamily: 'Roboto_700Bold' },
    list: { gap: 10, paddingBottom: 24 },
    toolsList: { gap: 10, paddingTop: 10, paddingBottom: 10 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    sectionTitle: { color: colors.text, fontFamily: 'Roboto_700Bold' },
    input: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.inputBg, color: colors.text },
    toolRow: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
    checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 2, borderColor: colors.border, marginTop: 2 },
    checkboxOn: { borderColor: colors.primary, backgroundColor: colors.primary },
    toolInfo: { flex: 1 },
    toolCode: { color: colors.primary, fontFamily: 'Roboto_700Bold' },
    toolName: { marginTop: 2, color: colors.text, fontFamily: 'Roboto_700Bold' },
    toolMeta: { marginTop: 4, color: colors.muted, fontFamily: 'Roboto_400Regular' },
    rowTitle: { color: colors.text, fontFamily: 'Roboto_700Bold' },
    meta: { marginTop: 6, color: colors.muted, fontFamily: 'Roboto_400Regular' },
    itemRow: { marginTop: 6, color: colors.text, fontFamily: 'Roboto_400Regular' },
    more: { marginTop: 6, color: colors.muted, fontFamily: 'Roboto_400Regular' },
    muted: { color: colors.muted, textAlign: 'center', marginTop: 20, fontFamily: 'Roboto_400Regular' },
  });
