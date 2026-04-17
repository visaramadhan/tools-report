import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Loan, Tool, User } from '../../types';

type SelectedToolItem = {
  toolId: string;
  toolName?: string;
  toolCode?: string;
  borrowedCondition: 'Good' | 'Bad';
  photo?: string;
};

type Props = {
  token: string;
  onOpenLoan: (loan: Loan) => void;
};

export default function AdminLoansScreen({ token, onOpenLoan }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [activeToolIndex, setActiveToolIndex] = useState<number | null>(null);
  
  const [toolsLoading, setToolsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTools, setSelectedTools] = useState<SelectedToolItem[]>([{ toolId: '', borrowedCondition: 'Good' }]);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Borrowed' | 'Returned' | 'PartiallyReturned' | 'Exchanged' | 'all'>('Borrowed');

  const selectedUser = useMemo(() => users.find(u => u.id === selectedUserId), [users, selectedUserId]);
  const showMessage = useCallback((title: string, message: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }, []);

  const load = useCallback(async () => {
    const url = statusFilter === 'all' ? '/api/mobile/loans' : `/api/mobile/loans?status=${statusFilter}`;
    const data = await apiRequest<Loan[]>(url, { token });
    setLoans(data);
  }, [token, statusFilter]);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const data = await apiRequest<Array<User & { _id: string }>>('/api/mobile/users?role=technician&status=true', { token });
      setUsers(data.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status
      })));
    } finally {
      setUsersLoading(false);
    }
  }, [token]);

  const loadTools = useCallback(async (q: string) => {
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

  useEffect(() => {
    if (!creating) return;
    loadUsers().catch(() => undefined);
  }, [creating, loadUsers]);

  useEffect(() => {
    if (activeToolIndex !== null) {
      loadTools(search).catch(() => undefined);
    }
  }, [activeToolIndex, loadTools, search]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const addToolRow = () => {
    setSelectedTools([...selectedTools, { toolId: '', borrowedCondition: 'Good' }]);
  };

  const removeToolRow = (index: number) => {
    if (selectedTools.length > 1) {
      const next = [...selectedTools];
      next.splice(index, 1);
      setSelectedTools(next);
    }
  };

  const selectToolForItem = (index: number, tool: Tool) => {
    const next = [...selectedTools];
    next[index] = { 
      ...next[index], 
      toolId: tool._id, 
      toolName: tool.name, 
      toolCode: tool.toolCode 
    };
    setSelectedTools(next);
    setActiveToolIndex(null);
    setSearch('');
  };

  const updateToolCondition = (index: number, condition: 'Good' | 'Bad') => {
    const next = [...selectedTools];
    next[index].borrowedCondition = condition;
    setSelectedTools(next);
  };

  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const next = [...selectedTools];
      next[index].photo = result.assets[0].uri;
      setSelectedTools(next);
    }
  };

  const startVerification = () => {
    if (!selectedUserId || selectedUserId === '') {
      showMessage('Gagal', 'Pilih user terlebih dahulu');
      return;
    }
    const invalid = selectedTools.some(it => !it.toolId || it.toolId === '');
    if (invalid) {
      showMessage('Gagal', 'Pastikan semua baris tools sudah dipilih');
      return;
    }
    const ids = selectedTools.map((it) => it.toolId);
    if (new Set(ids).size !== ids.length) {
      showMessage('Gagal', 'Ada tools yang dipilih lebih dari satu kali. Pilih tools yang berbeda.');
      return;
    }
    setIsVerifying(true);
  };

  const submitLoan = async () => {
    if (submitting) return;
    if (!selectedUserId || selectedUserId === '') {
      showMessage('Gagal', 'Pilih user terlebih dahulu');
      return;
    }
    const invalid = selectedTools.some((it) => !it.toolId || it.toolId === '');
    if (invalid) {
      showMessage('Gagal', 'Pastikan semua baris tools sudah dipilih');
      return;
    }
    const ids = selectedTools.map((it) => it.toolId);
    if (new Set(ids).size !== ids.length) {
      showMessage('Gagal', 'Ada tools yang dipilih lebih dari satu kali. Pilih tools yang berbeda.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('borrowerId', selectedUserId);

      const items: Array<{ toolId: string; borrowedCondition: 'Good' | 'Bad'; photoIndex?: number }> = [];
      let photoIndex = 0;
      for (const it of selectedTools) {
        if (it.photo) {
          items.push({
            toolId: it.toolId,
            borrowedCondition: it.borrowedCondition,
            photoIndex,
          });
          photoIndex += 1;
        } else {
          items.push({
            toolId: it.toolId,
            borrowedCondition: it.borrowedCondition,
          });
        }
      }
      formData.append('items', JSON.stringify(items));

      for (const it of selectedTools) {
        if (!it.photo) continue;
        const filename = it.photo.split('/').pop() || `loan-${Date.now()}.jpg`;
        if (Platform.OS === 'web') {
          const fetched = await fetch(it.photo);
          const blob = await fetched.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          formData.append('photos', file as any);
        } else {
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';
          formData.append('photos', { uri: it.photo, name: filename, type } as any);
        }
      }

      await apiRequest('/api/mobile/loans', {
        method: 'POST',
        token,
        body: formData,
      });

      showMessage('Berhasil', 'Peminjaman berhasil dibuat');
      setCreating(false);
      setIsVerifying(false);
      setSelectedTools([{ toolId: '', borrowedCondition: 'Good' }]);
      setSelectedUserId('');
      await load();
    } catch (e: any) {
      showMessage('Gagal', e?.message || 'Gagal membuat peminjaman');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredToolOptions = useMemo(() => {
    const excluded = new Set(
      selectedTools
        .map((it, idx) => (idx === activeToolIndex ? '' : it.toolId))
        .filter(Boolean)
    );
    return tools.filter((t) => {
      if (excluded.has(t._id)) return false;
      if (t.status === false) return false;
      if ((t.condition || 'Good') === 'Bad') return false;
      if (t.isBorrowed) return false;
      return true;
    });
  }, [activeToolIndex, selectedTools, tools]);

  const groupedLoans = useMemo(() => {
    const groups: Record<string, { user: string; loans: Loan[] }> = {};
    loans.forEach((loan) => {
      if (!groups[loan.borrowerId]) {
        groups[loan.borrowerId] = { user: loan.borrowerName, loans: [] };
      }
      groups[loan.borrowerId].loans.push(loan);
    });
    return Object.values(groups);
  }, [loans]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Borrowed': return 'Dipinjam';
      case 'Returned': return 'Dikembalikan';
      case 'PartiallyReturned': return 'Dipinjam (Sebagian)';
      case 'Exchanged': return 'Ditukar';
      default: return status;
    }
  };

  if (creating) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{isVerifying ? 'Verifikasi' : 'Tambah Pinjam'}</Text>
          <Pressable onPress={() => { setCreating(false); setIsVerifying(false); }}>
            <Text style={styles.link}>Batal</Text>
          </Pressable>
        </View>

        {!isVerifying ? (
          <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.card}>
              <Text style={styles.label}>Pilih User</Text>
              <Pressable style={styles.dropdownToggle} onPress={() => setShowUserDropdown(!showUserDropdown)}>
                <Text style={selectedUser ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedUser ? selectedUser.name : 'Pilih Teknisi...'}
                </Text>
                <Text style={styles.dropdownArrow}>{showUserDropdown ? '▲' : '▼'}</Text>
              </Pressable>

              {showUserDropdown && (
                <View style={styles.dropdownMenu}>
                  {usersLoading && <Text style={styles.muted}>Loading users...</Text>}
                  {users.map(u => (
                    <Pressable 
                      key={u.id} 
                      style={[styles.dropdownItem, selectedUserId === u.id && styles.dropdownItemActive]} 
                      onPress={() => { setSelectedUserId(u.id); setShowUserDropdown(false); }}
                    >
                      <Text style={[styles.dropdownItemText, selectedUserId === u.id && styles.dropdownItemTextActive]}>{u.name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>Tools yang Dipinjam</Text>
              {selectedTools.map((it, idx) => (
                <View key={idx} style={styles.toolRowSelection}>
                  <View style={{ flex: 1 }}>
                    <Pressable 
                      style={styles.dropdownToggle} 
                      onPress={() => setActiveToolIndex(activeToolIndex === idx ? null : idx)}
                    >
                      <Text style={it.toolId ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {it.toolId ? `${it.toolCode} - ${it.toolName}` : 'Pilih Tool...'}
                      </Text>
                      <Text style={styles.dropdownArrow}>{activeToolIndex === idx ? '▲' : '▼'}</Text>
                    </Pressable>
                    
                    {activeToolIndex === idx && (
                      <View style={styles.dropdownMenu}>
                        <TextInput
                          value={search}
                          onChangeText={setSearch}
                          placeholder="Cari tool..."
                          style={styles.dropdownSearch}
                          autoFocus
                        />
                        {toolsLoading && <Text style={styles.muted}>Loading tools...</Text>}
                        <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                          {filteredToolOptions.map(t => (
                            <Pressable 
                              key={t._id} 
                              style={styles.dropdownItem} 
                              onPress={() => selectToolForItem(idx, t)}
                            >
                              <Text style={styles.dropdownItemText}>{t.toolCode} - {t.name}</Text>
                            </Pressable>
                          ))}
                          {filteredToolOptions.length === 0 && !toolsLoading && <Text style={styles.muted}>Tidak ada tool tersedia</Text>}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                  {selectedTools.length > 1 && (
                    <Pressable style={styles.removeBtn} onPress={() => removeToolRow(idx)}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </Pressable>
                  )}
                </View>
              ))}

              <Pressable style={styles.addMoreBtn} onPress={addToolRow}>
                <Text style={styles.addMoreText}>+ Tambah Baris Tool</Text>
              </Pressable>
            </View>

            <Pressable style={styles.processBtn} onPress={startVerification}>
              <Text style={styles.processBtnText}>Lanjutkan Verifikasi</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView style={styles.formScroll} contentContainerStyle={{ paddingBottom: 100 }}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Detail Kondisi & Foto</Text>
              <Text style={styles.meta}>User: {selectedUser?.name}</Text>
              
              {selectedTools.map((it, idx) => (
                <View key={idx} style={styles.verifyItem}>
                  <Text style={styles.verifyToolTitle}>{it.toolCode} - {it.toolName}</Text>
                  
                  <View style={styles.conditionRow}>
                    <Pressable 
                      style={[styles.pill, it.borrowedCondition === 'Good' && styles.pillActive]} 
                      onPress={() => updateToolCondition(idx, 'Good')}
                    >
                      <Text style={[styles.pillText, it.borrowedCondition === 'Good' && styles.pillTextActive]}>Bagus</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.pill, it.borrowedCondition === 'Bad' && styles.pillActive]} 
                      onPress={() => updateToolCondition(idx, 'Bad')}
                    >
                      <Text style={[styles.pillText, it.borrowedCondition === 'Bad' && styles.pillTextActive]}>Rusak</Text>
                    </Pressable>
                  </View>

                  <Pressable style={styles.photoBox} onPress={() => pickImage(idx)}>
                    {it.photo ? (
                      <Image source={{ uri: it.photo }} style={styles.photoFull} />
                    ) : (
                      <Text style={styles.photoPlaceholder}>Ambil Foto Kondisi</Text>
                    )}
                  </Pressable>
                </View>
              ))}
            </View>

            <View style={styles.row}>
              <Pressable style={[styles.processBtn, { flex: 1, backgroundColor: '#6b7280' }]} onPress={() => setIsVerifying(false)}>
                <Text style={styles.processBtnText}>Kembali</Text>
              </Pressable>
              <View style={{ width: 12 }} />
              <Pressable 
                style={[styles.processBtn, { flex: 2 }, submitting && styles.btnDisabled]} 
                onPress={submitLoan}
                disabled={submitting}
              >
                <Text style={styles.processBtnText}>{submitting ? 'Menyimpan...' : 'Simpan Peminjaman'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Peminjaman</Text>
        <Pressable 
          style={styles.addBtn} 
          onPress={() => setCreating(true)}
        >
          <Text style={styles.addText}>Tambah</Text>
        </Pressable>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'Borrowed', 'Exchanged', 'Returned'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[styles.filterBtn, statusFilter === s && styles.filterBtnActive]}
            >
              <Text style={[styles.filterText, statusFilter === s && styles.filterTextActive]}>
                {s === 'all' ? 'Semua' : getStatusLabel(s)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={groupedLoans}
        keyExtractor={(i) => i.loans[0]._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <Text style={styles.muted}>Loading...</Text> : <Text style={styles.muted}>Tidak ada peminjaman</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onOpenLoan(item.loans[0])}>
            <Text style={styles.rowTitle}>{item.user}</Text>
            <Text style={styles.meta}>
              {item.loans.length} Peminjaman aktif • {item.loans.reduce((acc, l) => acc + l.items.filter(x => !x.returnedAt).length, 0)} item belum kembali
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
  title: { fontSize: 22, color: '#2A3547', textTransform: 'uppercase', fontFamily: 'Montserrat_800ExtraBold' },
  addBtn: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  addText: { color: '#fff', fontWeight: '900' },
  btnDisabled: { opacity: 0.6 },
  list: { gap: 10, paddingBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2, marginBottom: 10 },
  rowTitle: { fontWeight: '800', color: '#111827', fontSize: 16 },
  meta: { marginTop: 6, color: '#6b7280' },
  muted: { color: '#6b7280', textAlign: 'center', marginTop: 30 },
  sectionTitle: { color: '#111827', fontWeight: '800', fontSize: 16 },
  label: { fontWeight: '700', color: '#374151', fontSize: 14, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: '#0E5E7E', fontWeight: '700' },
  filterContainer: { marginBottom: 12 },
  filterScroll: { gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(42,53,71,0.1)' },
  filterBtnActive: { backgroundColor: '#0E5E7E', borderColor: '#0E5E7E' },
  filterText: { color: '#6b7280', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  formScroll: { flex: 1 },
  dropdownToggle: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(42,53,71,0.12)', 
    borderRadius: 12, 
    padding: 12, 
    backgroundColor: '#fff' 
  },
  dropdownText: { color: '#111827', fontWeight: '600' },
  dropdownPlaceholder: { color: '#9ca3af' },
  dropdownArrow: { color: '#6b7280', fontSize: 12 },
  dropdownMenu: { 
    marginTop: 4, 
    borderWidth: 1, 
    borderColor: 'rgba(42,53,71,0.12)', 
    borderRadius: 12, 
    backgroundColor: '#fff', 
    padding: 4,
    zIndex: 1000,
    elevation: 5
  },
  dropdownItem: { padding: 12, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: 'rgba(14,94,126,0.08)' },
  dropdownItemText: { color: '#374151', fontWeight: '600' },
  dropdownItemTextActive: { color: '#0E5E7E', fontWeight: '800' },
  dropdownSearch: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', marginBottom: 4 },
  toolRowSelection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fee2e2', justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#ef4444', fontWeight: '800' },
  addMoreBtn: { marginTop: 10, padding: 12, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#0E5E7E', alignItems: 'center' },
  addMoreText: { color: '#0E5E7E', fontWeight: '700' },
  processBtn: { marginTop: 20, backgroundColor: '#0E5E7E', borderRadius: 12, padding: 16, alignItems: 'center' },
  processBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  verifyItem: { marginTop: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  verifyToolTitle: { fontWeight: '800', color: '#111827', marginBottom: 10 },
  conditionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pill: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, alignItems: 'center' },
  pillActive: { borderColor: '#0E5E7E', backgroundColor: 'rgba(14,94,126,0.05)' },
  pillText: { fontWeight: '700', color: '#6b7280' },
  pillTextActive: { color: '#0E5E7E' },
  photoBox: { height: 120, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoPlaceholder: { color: '#9ca3af', fontWeight: '600' },
  photoFull: { width: '100%', height: '100%' },
});
