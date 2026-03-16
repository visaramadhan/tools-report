import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiRequest } from '../../api/client';
import { Loan } from '../../types';

type Props = {
  token: string;
  loan: Loan;
  onDone: () => void;
};

type ItemState = {
  condition: 'Good' | 'Bad';
  description: string;
};

export default function AdminLoanDetailScreen({ token, loan, onDone }: Props) {
  const [stateByTool, setStateByTool] = useState<Record<string, ItemState>>({});
  const [submitting, setSubmitting] = useState(false);

  const pending = useMemo(() => loan.items.filter((it) => !it.returnedAt), [loan.items]);

  const updateState = (toolId: string, next: Partial<ItemState>) => {
    setStateByTool((prev) => ({
      ...prev,
      [toolId]: { ...(prev[toolId] || { condition: 'Good', description: '' }), ...next },
    }));
  };

  const submit = async () => {
    if (pending.length === 0) {
      Alert.alert('Info', 'Semua item sudah kembali');
      onDone();
      return;
    }
    setSubmitting(true);
    try {
      const items = pending.map((it) => {
        const s = stateByTool[it.toolId] || { condition: 'Good', description: '' };
        return { toolId: it.toolId, condition: s.condition, description: s.description };
      });
      await apiRequest(`/api/mobile/loans/${loan._id}/return/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        token,
      });
      Alert.alert('Berhasil', 'Bulk pengembalian berhasil');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{loan.borrowerName}</Text>
        <Text style={styles.meta}>{new Date(loan.borrowedAt).toLocaleString()}</Text>
        <Text style={styles.meta}>Status: {loan.status}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Item Belum Kembali</Text>
        {pending.length === 0 ? (
          <Text style={styles.muted}>Tidak ada</Text>
        ) : (
          pending.map((it) => {
            const s = stateByTool[it.toolId] || { condition: 'Good', description: '' };
            return (
              <View key={it.toolId} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {it.toolCode} - {it.toolName}
                </Text>
                <View style={styles.row}>
                  <Pressable
                    onPress={() => updateState(it.toolId, { condition: 'Good' })}
                    style={[styles.pill, s.condition === 'Good' && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, s.condition === 'Good' && styles.pillTextActive]}>Good</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => updateState(it.toolId, { condition: 'Bad' })}
                    style={[styles.pill, s.condition === 'Bad' && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, s.condition === 'Bad' && styles.pillTextActive]}>Bad</Text>
                  </Pressable>
                </View>
                <TextInput
                  value={s.description}
                  onChangeText={(v) => updateState(it.toolId, { description: v })}
                  placeholder="Keterangan"
                  style={styles.input}
                />
              </View>
            );
          })
        )}
      </View>

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Proses...' : 'Kembalikan Semua (Bulk)'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A3547' },
  meta: { marginTop: 6, color: '#6b7280' },
  section: { fontWeight: '900', color: '#374151' },
  muted: { marginTop: 8, color: '#6b7280' },
  item: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.06)' },
  itemTitle: { fontWeight: '900', color: '#111827' },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pill: { flex: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  input: { marginTop: 10, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12 },
  button: { backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '900' },
});
