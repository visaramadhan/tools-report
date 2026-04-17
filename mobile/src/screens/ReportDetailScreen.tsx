import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { apiRequest, getApiBaseUrlForDisplay } from '../api/client';
import ShipReplacementModal from '../components/ShipReplacementModal';
import { Replacement, Report } from '../types';
import { useAppTheme } from '../theme';
import { getPdfModules } from '../utils/pdfModules';

type Setting = {
  companyName?: string;
  logoUrl?: string;
  footerText?: string;
  primaryColor?: string;
};

export default function ReportDetailScreen() {
  const route = useRoute<any>();
  const report = route.params?.report as Report | undefined;
  const token = route.params?.token as string | undefined;
  const role = route.params?.role as string | undefined;
  const isAdmin = role === 'admin' && !!token;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [statusTitle, setStatusTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusDetail, setStatusDetail] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [shipOpen, setShipOpen] = useState(false);
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [loadingReplacement, setLoadingReplacement] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const baseUrl = await getApiBaseUrlForDisplay();
        setApiBaseUrl(baseUrl);
        try {
          const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/settings`);
          if (res.ok) {
            const data = (await res.json()) as Setting;
            setSettings(data);
          }
        } catch {}
      } catch {
        setApiBaseUrl('');
      }
    })();
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && pdfBlobUrl) {
          window.URL.revokeObjectURL(pdfBlobUrl);
        }
      } catch {}
    };
  }, [pdfBlobUrl]);

  const refreshReplacement = useCallback(async () => {
    if (!token || !isAdmin || !report?.replacementId) return;
    setLoadingReplacement(true);
    try {
      const list = await apiRequest<Replacement[]>('/api/mobile/replacements', { token });
      const found = list.find((r) => r._id === String(report.replacementId)) || null;
      setReplacement(found);
    } catch {
      setReplacement(null);
    } finally {
      setLoadingReplacement(false);
    }
  }, [isAdmin, report?.replacementId, token]);

  useEffect(() => {
    refreshReplacement().catch(() => undefined);
  }, [refreshReplacement]);

  const reportPhotos = useMemo(() => {
    if (!report) return [];
    if (report.photoUrls && report.photoUrls.length > 0) return report.photoUrls;
    if (report.photoUrl) return [report.photoUrl];
    return [];
  }, [report]);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string) => {
    let timeoutId: any;
    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), ms);
        }),
      ]);
    } finally {
      try {
        clearTimeout(timeoutId);
      } catch {}
    }
  };

  const toFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const base = apiBaseUrl ? (apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl) : 'http://localhost:3001';
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  };

  const loadImageAsDataUrl = async (url: string) => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    try {
      const res = await withTimeout(
        fetch(url, controller ? { signal: controller.signal } : undefined),
        15000,
        'Timeout saat mengambil gambar',
      );
      if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
      const blob = await withTimeout(res.blob(), 15000, 'Timeout saat memproses gambar');
      const dataUrl = await withTimeout(
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Failed to read image'));
          reader.readAsDataURL(blob);
        }),
        15000,
        'Timeout saat membaca gambar',
      );
      return dataUrl;
    } finally {
      try {
        controller?.abort();
      } catch {}
    }
  };

  const addLetterhead = async (doc: any, title: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const primary = settings?.primaryColor && typeof settings.primaryColor === 'string' ? settings.primaryColor : '#0E5E7E';
    const companyName = settings?.companyName || 'Enerflex Asset';

    doc.setFillColor(primary);
    doc.rect(0, 0, pageWidth, 10, 'F');

    let leftX = 14;
    const topY = 18;

    const rawLogo = settings?.logoUrl ? String(settings.logoUrl) : '';
    const logoUrl = rawLogo ? toFullUrl(rawLogo) : '';
    if (logoUrl) {
      try {
        const dataUrl = await loadImageAsDataUrl(logoUrl);
        const imgFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(dataUrl, imgFormat, leftX, topY, 18, 18);
        leftX += 22;
      } catch {}
    }

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(14);
    doc.text(companyName, leftX, topY + 6);
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    doc.text(title, leftX, topY + 13);

    doc.setDrawColor(209, 213, 219);
    doc.line(14, 40, pageWidth - 14, 40);
  };

  const addFooter = (doc: any) => {
    const pageCount = doc.getNumberOfPages();
    const footerText = settings?.footerText || 'Dokumen ini dibuat otomatis oleh Tools Report System';
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(footerText, 14, pageHeight - 10);
      doc.text(`Halaman ${i} / ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
    }
  };

  const exportPdf = async () => {
    if (Platform.OS !== 'web') {
      setStatusType('info');
      setStatusTitle('Info');
      setStatusMessage('Export PDF saat ini hanya tersedia di versi Web (Chrome).');
      setStatusDetail('');
      setStatusOpen(true);
      return;
    }
    if (!report) return;
    setExporting(true);
    try {
      if (typeof window !== 'undefined' && pdfBlobUrl) window.URL.revokeObjectURL(pdfBlobUrl);
    } catch {}
    setPdfBlobUrl('');
    setStatusType('info');
    setStatusTitle('Sedang Export File');
    setStatusMessage('Sedang export file PDF, mohon tunggu...');
    setStatusDetail('');
    setStatusOpen(true);
    try {
      await sleep(50);
      const { jsPDF, autoTable } = getPdfModules();
      const doc = new jsPDF();
      await addLetterhead(doc, 'Laporan Kondisi Tools');

      const createdAt = new Date((report as any).createdAt);
      const toolCode = (report as any).toolCode || '-';
      const toolName = (report as any).toolName || '-';
      const category = (report as any).category || '-';
      const subCategory = (report as any).subCategory || '-';
      const technicianName = (report as any).technicianName || '-';
      const examinerName = (report as any).examinerName || technicianName || '-';
      const condition = (report as any).condition || '-';
      const description = (report as any).description || '-';

      const rawPhotos: string[] = Array.isArray((report as any).photoUrls) && (report as any).photoUrls.length > 0
        ? (report as any).photoUrls
        : (report as any).photoUrl
          ? [String((report as any).photoUrl)]
          : [];
      const photosAbs = rawPhotos.map((p) => toFullUrl(String(p))).filter(Boolean);

      setStatusMessage('Menyiapkan dokumen PDF...');

      const rows = [
        ['Tanggal', createdAt.toLocaleString()],
        ['Tool Code', String(toolCode)],
        ['Tools', String(toolName)],
        ['Kategori', String(category)],
        ['Sub Kategori', String(subCategory)],
        ['Pelapor', String(technicianName)],
        ['Pemeriksa', String(examinerName)],
        ['Kondisi', String(condition)],
        ['Keterangan', String(description)],
        ['Jumlah Foto', String(photosAbs.length)],
      ];

      autoTable(doc, {
        head: [['Field', 'Value']],
        body: rows,
        startY: 46,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
        columnStyles: { 0: { cellWidth: 40 } },
      });

      const lastAuto = (doc as any).lastAutoTable;
      const afterTableY = lastAuto && typeof lastAuto.finalY === 'number' ? lastAuto.finalY + 10 : 110;
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text('Tanda Tangan', 14, afterTableY);
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.3);
      const signY = afterTableY + 8;
      const colW = (pageWidth - 28) / 3;
      const labels = ['Pelapor', 'Pemeriksa', 'Mengetahui'];
      for (let i = 0; i < 3; i++) {
        const x = 14 + colW * i;
        doc.setFontSize(9);
        doc.setTextColor(107, 114, 128);
        doc.text(labels[i], x, signY);
        doc.setDrawColor(156, 163, 175);
        doc.line(x, signY + 22, x + colW - 10, signY + 22);
      }

      if (photosAbs.length > 0) {
        for (let i = 0; i < photosAbs.length; i++) {
          setStatusMessage(`Mengambil foto ${i + 1} / ${photosAbs.length}...`);
          await sleep(0);
          const url = photosAbs[i];
          doc.addPage();
          await addLetterhead(doc, `Lampiran Foto (${i + 1}/${photosAbs.length})`);
          doc.setFontSize(11);
          doc.setTextColor(17, 24, 39);
          doc.text(`Foto ${i + 1}`, 14, 48);
          try {
            const dataUrl = await loadImageAsDataUrl(url);
            const imgProps = (doc as any).getImageProperties(dataUrl);
            const imgFormat = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            const pw = doc.internal.pageSize.getWidth();
            const ph = doc.internal.pageSize.getHeight();
            const maxW = pw - 28;
            const maxH = ph - 70;
            const ratioW = imgProps.width ? maxW / imgProps.width : 1;
            const ratioH = imgProps.height ? maxH / imgProps.height : 1;
            const ratio = Math.min(ratioW, ratioH, 1);
            const w = imgProps.width ? imgProps.width * ratio : maxW;
            const h = imgProps.height ? imgProps.height * ratio : maxH;
            doc.addImage(dataUrl, imgFormat, 14, 54, w, h);
          } catch {
            doc.setFontSize(10);
            doc.setTextColor(107, 114, 128);
            doc.text('Gagal memuat foto. Link:', 14, 58);
            doc.setTextColor(37, 99, 235);
            doc.text(url, 14, 64);
          }
        }
      }

      addFooter(doc);

      const safeCode = String(toolCode || 'report').replace(/[^\\w-]+/g, '_');
      const fileName = `Laporan_${safeCode}_${createdAt.toISOString().slice(0, 10)}.pdf`;

      setStatusMessage('Menyelesaikan file PDF...');

      let blobUrl = '';
      try {
        const blob = doc.output('blob');
        blobUrl = typeof window !== 'undefined' ? window.URL.createObjectURL(blob) : '';
        if (blobUrl) setPdfBlobUrl(blobUrl);
      } catch {}

      try {
        if (typeof window !== 'undefined' && blobUrl) {
          const a = window.document.createElement('a');
          a.href = blobUrl;
          a.download = fileName;
          a.rel = 'noopener';
          a.click();
        } else {
          doc.save(fileName);
        }
      } catch {
        try {
          doc.save(fileName);
        } catch {}
      }

      setStatusType('success');
      setStatusTitle('Sukses');
      setStatusMessage('Export PDF berhasil. Jika file tidak otomatis terunduh, klik "Buka PDF".');
      setStatusDetail(fileName);
    } catch (e: any) {
      const detail = e instanceof Error ? e.stack || e.message : String(e || '');
      setStatusType('error');
      setStatusTitle('Gagal');
      setStatusMessage(e?.message || 'Gagal export PDF');
      setStatusDetail(detail);
    } finally {
      setExporting(false);
    }
  };

  if (!report) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Detail Laporan</Text>
        <Text style={styles.muted}>Data laporan tidak ditemukan</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Detail Laporan</Text>
            <Text style={styles.toolName}>
              {report.toolCode ? `${report.toolCode} - ` : ''}{report.toolName}
            </Text>
          </View>
          <View style={[styles.conditionPill, report.condition === 'Bad' ? styles.conditionBad : styles.conditionGood]}>
            <Text style={[styles.conditionText, report.condition === 'Bad' ? styles.conditionTextBad : styles.conditionTextGood]}>
              {report.condition}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Waktu</Text>
            <Text style={styles.value}>{new Date(report.createdAt).toLocaleString()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pelapor</Text>
            <Text style={styles.value}>{report.technicianName}</Text>
          </View>
          {report.examinerName && report.examinerName !== report.technicianName ? (
            <View style={styles.row}>
              <Text style={styles.label}>Pemeriksa</Text>
              <Text style={styles.value}>{report.examinerName}</Text>
            </View>
          ) : null}
          {report.description ? (
            <View style={styles.descBox}>
              <Text style={styles.descTitle}>Keterangan</Text>
              <Text style={styles.descText}>{report.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.photosHeader}>
          <Text style={styles.sectionTitle}>Foto ({reportPhotos.length})</Text>
        </View>
        {reportPhotos.length === 0 ? (
          <Text style={styles.muted}>Tidak ada foto</Text>
        ) : (
          <View style={styles.photoGrid}>
            {reportPhotos.map((p) => {
              const full = toFullUrl(p);
              return (
                <Pressable key={p} style={styles.photoItem} onPress={() => setPreviewPhoto(full)}>
                  <Image source={{ uri: full }} style={styles.photo} resizeMode="cover" />
                </Pressable>
              );
            })}
          </View>
        )}

        {isAdmin && report.condition === 'Bad' ? (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Aksi Admin</Text>
            {loadingReplacement ? <Text style={styles.muted}>Memuat status penggantian...</Text> : null}
            {replacement && (replacement.status === 'Shipped' || !!replacement.newToolCode) ? (
              <>
                <Text style={styles.muted}>Tools Sudah Diganti</Text>
                {replacement.newToolCode ? (
                  <Text style={styles.muted}>
                    Pengganti: {replacement.newToolCode} {replacement.newToolName ? `- ${replacement.newToolName}` : ''}
                  </Text>
                ) : null}
              </>
            ) : (
              <>
                <Text style={styles.muted}>Tools BAD: kirim tools pengganti (sub kategori sama).</Text>
                <Pressable
                  style={[styles.swapBtn, (loadingReplacement || !report.replacementId) && { opacity: 0.7 }]}
                  onPress={() => {
                    if (!report.replacementId) {
                      Alert.alert('Info', 'Replacement ID tidak ditemukan pada report ini.');
                      return;
                    }
                    setShipOpen(true);
                  }}
                  disabled={loadingReplacement}
                >
                  <Text style={styles.swapBtnText}>Ganti Tools</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={[styles.exportBtn, exporting && styles.exportBtnDisabled]} onPress={exportPdf} disabled={exporting}>
          <Text style={styles.exportText}>{exporting ? 'Sedang Export...' : 'Export PDF'}</Text>
        </Pressable>
      </View>

      <Modal visible={!!previewPhoto} transparent onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.modalBg}>
          <Pressable style={styles.closeBtn} onPress={() => setPreviewPhoto(null)}>
            <FontAwesomeIcon icon={faTimes} color="#fff" size={24} />
          </Pressable>
          {previewPhoto ? <Image source={{ uri: previewPhoto }} style={styles.fullImage} resizeMode="contain" /> : null}
        </View>
      </Modal>

      {isAdmin && token && report.replacementId ? (
        <ShipReplacementModal
          token={token}
          visible={shipOpen}
          onClose={() => setShipOpen(false)}
          replacementId={String(report.replacementId)}
          subCategory={String(report.subCategory || '')}
          oldToolLabel={`${report.toolCode ? `${report.toolCode} - ` : ''}${report.toolName}`}
          requesterLabel={String(report.technicianName || '')}
          onSuccess={refreshReplacement}
        />
      ) : null}

      {statusOpen ? (
        <View style={styles.statusOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => (!exporting ? setStatusOpen(false) : null)} />
          <View style={styles.statusCard}>
            <Text
              style={[
                styles.statusTitle,
                statusType === 'error' ? styles.statusTitleError : statusType === 'success' ? styles.statusTitleSuccess : styles.statusTitleInfo,
              ]}
            >
              {statusTitle}
            </Text>
            {statusType === 'info' ? <ActivityIndicator style={styles.statusSpinner} size="small" color="#0E5E7E" /> : null}
            <Text style={styles.statusMessage}>{statusMessage}</Text>
            {statusDetail ? <Text style={styles.statusDetail}>{statusDetail}</Text> : null}

            <View style={styles.statusActions}>
              <Pressable
                style={[styles.statusBtn, styles.statusBtnSecondary, exporting && styles.statusBtnDisabled]}
                onPress={() => setStatusOpen(false)}
                disabled={exporting}
              >
                <Text style={[styles.statusBtnSecondaryText, exporting && styles.statusBtnSecondaryTextDisabled]}>Tutup</Text>
              </Pressable>
              {Platform.OS === 'web' && pdfBlobUrl ? (
                <Pressable
                  style={[styles.statusBtn, styles.statusBtnPrimary]}
                  onPress={() => {
                    try {
                      if (typeof window !== 'undefined') window.open(pdfBlobUrl, '_blank');
                    } catch {}
                  }}
                >
                  <Text style={styles.statusBtnPrimaryText}>Buka PDF</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: { background: string; card: string; text: string; muted: string; border: string; inputBg: string; primary: string; danger: string }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { padding: 16, paddingBottom: 28 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginTop: 6, marginBottom: 12 },
    headerInfo: { flex: 1 },
    title: { fontSize: 22, color: colors.text, fontFamily: 'Montserrat_800ExtraBold' },
    toolName: { marginTop: 8, fontSize: 15, color: colors.text, fontWeight: '800', fontFamily: 'Roboto_700Bold' },
    muted: { color: colors.muted, marginTop: 10 },
    conditionPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
    conditionGood: { backgroundColor: 'rgba(34,197,94,0.10)', borderColor: 'rgba(34,197,94,0.25)' },
    conditionBad: { backgroundColor: 'rgba(239,68,68,0.10)', borderColor: 'rgba(239,68,68,0.25)' },
    conditionText: { fontSize: 12, fontWeight: '900' },
    conditionTextGood: { color: '#16a34a' },
    conditionTextBad: { color: colors.danger },
    infoCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, marginBottom: 10 },
    label: { color: colors.muted, fontSize: 13, fontWeight: '800', width: 90 },
    value: { color: colors.text, fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
    descBox: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
    descTitle: { color: colors.muted, fontSize: 13, fontWeight: '800' },
    descText: { marginTop: 6, color: colors.text, fontSize: 14, lineHeight: 20 },
    photosHeader: { marginTop: 16, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: colors.text },
    actionCard: { backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 14, shadowColor: 'rgba(0,0,0,0.25)', shadowOpacity: 0.08, shadowRadius: 12, elevation: 2 },
    actionTitle: { fontSize: 14, fontWeight: '900', color: colors.text },
    swapBtn: { marginTop: 12, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    swapBtnText: { color: '#fff', fontWeight: '900' },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    photoItem: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(42,53,71,0.16)' },
    photo: { width: '100%', height: '100%' },
    bottomBar: { padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    exportBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    exportBtnDisabled: { opacity: 0.7 },
    exportText: { color: '#fff', fontWeight: '900' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 },
    fullImage: { width: '100%', height: '80%' },
    statusOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    statusCard: { width: '100%', maxWidth: 520, backgroundColor: colors.card, borderRadius: 16, padding: 16 },
    statusTitle: { fontSize: 18, fontWeight: '900', color: colors.text },
    statusTitleInfo: { color: colors.primary },
    statusTitleSuccess: { color: '#16a34a' },
    statusTitleError: { color: colors.danger },
    statusSpinner: { marginTop: 12 },
    statusMessage: { marginTop: 8, fontSize: 14, color: colors.text, fontWeight: '700' },
    statusDetail: { marginTop: 10, fontSize: 12, color: colors.muted },
    statusActions: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    statusBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
    statusBtnSecondary: { backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.border },
    statusBtnSecondaryText: { color: colors.text, fontWeight: '800' },
    statusBtnSecondaryTextDisabled: { color: colors.muted },
    statusBtnPrimary: { backgroundColor: colors.primary },
    statusBtnPrimaryText: { color: '#fff', fontWeight: '900' },
    statusBtnDisabled: { opacity: 0.7 },
  });
