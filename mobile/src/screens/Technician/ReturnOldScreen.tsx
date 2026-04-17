import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { apiRequest } from '../../api/client';
import { Replacement } from '../../types';
import { useAppTheme } from '../../theme';

type Props = {
  token: string;
  replacement: Replacement;
  onDone: () => void;
};

export default function ReturnOldScreen({ token, replacement, onDone }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [condition, setCondition] = useState<'Good' | 'Bad'>('Bad');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Izin', 'Izin galeri diperlukan');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled && res.assets[0]) setPhoto(res.assets[0]);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('condition', condition);
      fd.append('description', description);
      if (photo && photo.uri) {
        const name = photo.fileName || `return-old-${Date.now()}.jpg`;
        const type = photo.mimeType || 'image/jpeg';
        fd.append('photo', { uri: photo.uri, name, type } as any);
      }
      await apiRequest(`/api/mobile/replacements/${replacement._id}/return-old`, { method: 'PUT', body: fd, token });
      Alert.alert('Berhasil', 'Tools lama sedang dikirim');
      onDone();
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirim Tools Lama</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Tools Lama</Text>
        <Text style={styles.value}>
          {replacement.oldToolCode} - {replacement.oldToolName}
        </Text>

        <Text style={[styles.label, { marginTop: 14 }]}>Kondisi</Text>
        <View style={styles.row}>
          <Pressable onPress={() => setCondition('Good')} style={[styles.pill, condition === 'Good' && styles.pillActive]}>
            <Text style={[styles.pillText, condition === 'Good' && styles.pillTextActive]}>Good</Text>
          </Pressable>
          <Pressable onPress={() => setCondition('Bad')} style={[styles.pill, condition === 'Bad' && styles.pillActive]}>
            <Text style={[styles.pillText, condition === 'Bad' && styles.pillTextActive]}>Bad</Text>
          </Pressable>
        </View>

        <Text style={[styles.label, { marginTop: 14 }]}>Keterangan Pengiriman</Text>
        <TextInput value={description} onChangeText={setDescription} placeholder="Catatan..." style={[styles.input, { height: 90 }]} multiline placeholderTextColor={colors.muted} />

        <Pressable style={styles.secondaryButton} onPress={pickPhoto}>
          <Text style={styles.secondaryText}>{photo ? 'Ganti Foto' : 'Pilih Foto'}</Text>
        </Pressable>

        <Pressable style={[styles.button, loading && styles.buttonDisabled]} onPress={submit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Proses...' : 'Kirim'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 16 },
    title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 6, marginBottom: 12 },
    card: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.1, shadowRadius: 12, elevation: 2 },
    label: { fontWeight: '800', color: colors.text },
    value: { marginTop: 6, fontWeight: '800', color: colors.text },
    row: { flexDirection: 'row', gap: 10, marginTop: 8 },
    pill: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingVertical: 10, alignItems: 'center', backgroundColor: colors.card },
    pillActive: { borderColor: colors.primary, backgroundColor: 'rgba(14,94,126,0.14)' },
    pillText: { color: colors.text, fontWeight: '800' },
    pillTextActive: { color: colors.primary },
    input: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, textAlignVertical: 'top', backgroundColor: colors.inputBg, color: colors.text },
    secondaryButton: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 11, alignItems: 'center', backgroundColor: colors.card },
    secondaryText: { fontWeight: '800', color: colors.primary },
    button: { marginTop: 14, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: '800' },
  });
