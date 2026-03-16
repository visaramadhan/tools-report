import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Replacement, Report, Tool } from '../../types';

type Props = {
  token: string;
  replacement: Replacement;
  onDone: () => void;
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

export default function AdminReplacementDetailScreen({ token, replacement, onDone }: Props) {
  const [current, setCurrent] = useState<Replacement>(replacement);
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [selectedNewToolId, setSelectedNewToolId] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [returnCondition, setReturnCondition] = useState<'Good' | 'Bad'>('Bad');
  const [returnDescription, setReturnDescription] = useState<string>('');
  const [returnPhoto, setReturnPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [history, setHistory] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedNewTool = useMemo(
    () => availableTools.find((t) => t._id === selectedNewToolId),
    [availableTools, selectedNewToolId]
  );

  const refresh = useCallback(async () => {
    const [repls, tools, hist] = await Promise.all([
      apiRequest<Replacement[]>('/api/mobile/replacements', { token }),
      apiRequest<Tool[]>('/api/mobile/tools?available=true', { token }),
      apiRequest<Report[]>(`/api/mobile/reports?toolId=${current.oldToolId}`, { token }),
    ]);
    const found = repls.find((r) => r._id === current._id);
    if (found) setCurrent(found);
    setAvailableTools(tools);
    setHistory(hist.slice(0, 5));
  }, [token, current._id, current.oldToolId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await refresh();
      } catch (e: any) {
        Alert.alert('Gagal', e?.message || 'Gagal memuat');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateJson = async (payload: Record<string, unknown>) => {
    const updated = await apiRequest<Replacement>(`/api/mobile/replacements/${current._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      token,
    });
    setCurrent(updated);
  };

  const approve = async () => {
    if (!selectedNewToolId) {
      Alert.alert('Validasi', 'Pilih tools pengganti dulu');
      return;
    }
    try {
      await updateJson({ status: 'Approved', newToolId: selectedNewToolId, note });
      Alert.alert('Berhasil', 'Approved');
      await refresh();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const ship = async () => {
    try {
      await updateJson({ status: 'Shipped', note });
      Alert.alert('Berhasil', 'Pengiriman tools');
      await refresh();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const reject = async () => {
    try {
      await updateJson({ status: 'Rejected', note });
      Alert.alert('Berhasil', 'Ditolak');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const pickReturnPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin', 'Izin galeri diperlukan');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setReturnPhoto(res.assets[0]);
  };

  const markOldReturned = async () => {
    try {
      const fd = new FormData();
      fd.append('status', 'OldReturned');
      fd.append('returnCondition', returnCondition);
      fd.append('returnDescription', returnDescription);
      fd.append('note', note);
      if (returnPhoto?.uri) {
        const name = returnPhoto.fileName || `return-${Date.now()}.jpg`;
        const type = returnPhoto.mimeType || 'image/jpeg';
        fd.append('returnPhoto', { uri: returnPhoto.uri, name, type } as any);
      }

      const updated = await apiRequest<Replacement>(`/api/mobile/replacements/${current._id}`, {
        method: 'PUT',
        body: fd,
        token,
      });
      setCurrent(updated);
      Alert.alert('Berhasil', 'Tools lama diterima');
      await refresh();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const verify = async () => {
    try {
      await updateJson({ status: 'Verified', note });
      Alert.alert('Berhasil', 'Verifikasi');
      await refresh();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  const complete = async () => {
    try {
      await updateJson({ status: 'Completed', note });
      Alert.alert('Berhasil', 'Selesai');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Penggantian</Text>
        <Text style={styles.meta}>Status: {statusText(current.status)}</Text>
        <Text style={styles.section}>Tools Lama</Text>
        <Text style={styles.value}>
          {current.oldToolCode} - {current.oldToolName}
        </Text>

        {current.newToolCode ? (
          <>
            <Text style={styles.section}>Tools Baru</Text>
            <Text style={styles.value}>
              {current.newToolCode} - {current.newToolName}
            </Text>
          </>
        ) : null}

        <Text style={styles.section}>Catatan</Text>
        <TextInput value={note} onChangeText={setNote} placeholder="Catatan admin" style={styles.input} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Riwayat Report (Tools Lama)</Text>
        {history.length === 0 ? (
          <Text style={styles.muted}>Tidak ada riwayat</Text>
        ) : (
          history.map((r) => (
            <View key={r._id} style={styles.historyItem}>
              <Text style={styles.historyTitle}>
                {new Date(r.createdAt).toLocaleString()} • {r.condition}
              </Text>
              {r.description ? <Text style={styles.muted}>{r.description}</Text> : null}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Aksi</Text>

        <Text style={styles.label}>Pilih Tools Pengganti (available)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolPills}>
          {availableTools.map((t) => (
            <Pressable
              key={t._id}
              onPress={() => setSelectedNewToolId(t._id)}
              style={[styles.pill, selectedNewToolId === t._id && styles.pillActive]}
            >
              <Text style={[styles.pillText, selectedNewToolId === t._id && styles.pillTextActive]}>{t.toolCode}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {selectedNewTool ? <Text style={styles.muted}>Dipilih: {selectedNewTool.name}</Text> : null}

        <View style={styles.row}>
          <Pressable style={styles.button} onPress={approve} disabled={loading}>
            <Text style={styles.buttonText}>Approve</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={ship} disabled={loading}>
            <Text style={styles.buttonText}>Pengiriman</Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.secondaryButton} onPress={reject}>
            <Text style={styles.secondaryText}>Tolak</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={verify}>
            <Text style={styles.secondaryText}>Verifikasi</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={complete}>
            <Text style={styles.secondaryText}>Selesai</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Terima Tools Lama</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setReturnCondition('Good')} style={[styles.pillWide, returnCondition === 'Good' && styles.pillActive]}>
            <Text style={[styles.pillText, returnCondition === 'Good' && styles.pillTextActive]}>Good</Text>
          </Pressable>
          <Pressable onPress={() => setReturnCondition('Bad')} style={[styles.pillWide, returnCondition === 'Bad' && styles.pillActive]}>
            <Text style={[styles.pillText, returnCondition === 'Bad' && styles.pillTextActive]}>Bad</Text>
          </Pressable>
        </View>
        <TextInput
          value={returnDescription}
          onChangeText={setReturnDescription}
          placeholder="Keterangan pengecekan"
          style={[styles.input, { height: 90 }]}
          multiline
        />
        <Pressable style={styles.secondaryButton} onPress={pickReturnPhoto}>
          <Text style={styles.secondaryText}>{returnPhoto ? 'Ganti Foto' : 'Pilih Foto'}</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={markOldReturned}>
          <Text style={styles.buttonText}>Terima Tools Lama</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { padding: 16, paddingBottom: 30, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, shadowColor: '#0A3E55', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
  title: { fontSize: 18, fontWeight: '900', color: '#2A3547' },
  meta: { marginTop: 8, color: '#6b7280' },
  section: { marginTop: 12, fontWeight: '900', color: '#374151' },
  value: { marginTop: 6, fontWeight: '800', color: '#111827' },
  input: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, padding: 12 },
  label: { marginTop: 10, fontWeight: '800', color: '#374151' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  button: { flexGrow: 1, backgroundColor: '#0E5E7E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.12)', borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, alignItems: 'center' },
  secondaryText: { fontWeight: '900', color: '#0E5E7E' },
  toolPills: { gap: 8, paddingVertical: 10 },
  pill: { borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  pillWide: { flexGrow: 1, borderWidth: 1, borderColor: 'rgba(42,53,71,0.10)', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  pillActive: { borderColor: 'rgba(14,94,126,0.45)', backgroundColor: 'rgba(14,94,126,0.06)' },
  pillText: { fontWeight: '900', color: '#374151' },
  pillTextActive: { color: '#0E5E7E' },
  muted: { marginTop: 6, color: '#6b7280' },
  historyItem: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(42,53,71,0.06)' },
  historyTitle: { fontWeight: '900', color: '#111827' },
});

