import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { apiRequest } from '../../api/client';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faClipboardList, faWrench, faInbox, faCheckCircle, faCircleXmark } from '@fortawesome/free-solid-svg-icons';
import { useAppTheme } from '../../theme';

type DashboardData = {
  summary: {
    tools: { total: number; borrowed: number; available: number };
    reports: { total: number; good: number; bad: number };
    loans: { active: number };
  };
};

type Props = {
  token: string;
};

export default function AdminDashboardScreen({ token }: Props) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiRequest<DashboardData>('/api/mobile/dashboard', { token });
      setData(res);
    } catch (e: any) {
      Alert.alert('Gagal', e?.message || 'Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const s = data?.summary;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Ringkasan Laporan & Alat</Text>
      </View>

      <View style={styles.grid}>
        {/* Reports Summary */}
        <View style={[styles.card, styles.fullWidth]}>
          <View style={styles.cardHeader}>
            <FontAwesomeIcon icon={faClipboardList} color={colors.primary} size={20} />
            <Text style={styles.cardTitle}>Summary Reports</Text>
          </View>
          <View style={styles.reportStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{s?.reports.total || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.row}>
                <FontAwesomeIcon icon={faCheckCircle} color="#10b981" size={14} />
                <Text style={[styles.statLabel, { marginLeft: 4 }]}>Baik</Text>
              </View>
              <Text style={[styles.statValue, { color: '#10b981' }]}>{s?.reports.good || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.row}>
                <FontAwesomeIcon icon={faCircleXmark} color="#ef4444" size={14} />
                <Text style={[styles.statLabel, { marginLeft: 4 }]}>Rusak</Text>
              </View>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>{s?.reports.bad || 0}</Text>
            </View>
          </View>
        </View>

        {/* Tools Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesomeIcon icon={faWrench} color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>Tools</Text>
          </View>
          <Text style={styles.statMain}>{s?.tools.total || 0}</Text>
          <Text style={styles.statSub}>{s?.tools.available || 0} Tersedia</Text>
          <Text style={styles.statSub}>{s?.tools.borrowed || 0} Dipinjam</Text>
        </View>

        {/* Loans Summary */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesomeIcon icon={faInbox} color={colors.primary} size={18} />
            <Text style={styles.cardTitle}>Peminjaman</Text>
          </View>
          <Text style={styles.statMain}>{s?.loans.active || 0}</Text>
          <Text style={styles.statSub}>Aktif</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { padding: 20, paddingTop: 24 },
    title: { fontSize: 24, fontFamily: 'Montserrat_800ExtraBold', color: colors.text },
    subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
    grid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, width: '48%', shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.08, shadowRadius: 15, elevation: 3 },
    fullWidth: { width: '100%' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    reportStats: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8 },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: colors.muted, fontWeight: '600' },
    statValue: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 4 },
    statMain: { fontSize: 28, fontWeight: '900', color: colors.primary },
    statSub: { fontSize: 12, color: colors.muted, marginTop: 2, fontWeight: '500' },
    row: { flexDirection: 'row', alignItems: 'center' },
  });
