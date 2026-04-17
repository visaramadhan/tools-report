import * as jsPDFModule from 'jspdf';
import * as autoTableModule from 'jspdf-autotable';

type ReportLike = {
  createdAt: string;
  toolName?: string;
  technicianName?: string;
  condition?: string;
  description?: string;
};

export function exportReportsPdfWeb(payload: {
  title: string;
  subtitle: string;
  fileName: string;
  reports: ReportLike[];
}) {
  const jsPDF = (jsPDFModule as any).default || (jsPDFModule as any).jsPDF || (jsPDFModule as any);
  const autoTable = (autoTableModule as any).default || (autoTableModule as any).autoTable || (autoTableModule as any);

  const doc = new jsPDF({ orientation: 'portrait' });
  doc.setFontSize(16);
  doc.setTextColor(17, 24, 39);
  doc.text(payload.title, 14, 16);
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.text(payload.subtitle, 14, 22);

  const sorted = [...payload.reports].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const body = sorted.map((r, idx) => [
    String(idx + 1),
    new Date(r.createdAt).toLocaleString(),
    r.toolName || '-',
    r.technicianName || '-',
    r.condition || '-',
    r.description || '-',
  ]);

  autoTable(doc, {
    head: [['No.', 'Tanggal', 'Nama Tools', 'Nama Pelapor', 'Kondisi', 'Keterangan']],
    body,
    startY: 28,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3, valign: 'top' },
    headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
    columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 34 }, 2: { cellWidth: 42 }, 3: { cellWidth: 38 }, 4: { cellWidth: 18 } },
  });

  const blob = doc.output('blob');
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = payload.fileName;
  a.rel = 'noopener';
  a.click();
  try {
    window.URL.revokeObjectURL(url);
  } catch {}
}

