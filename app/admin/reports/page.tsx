'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Download, Mail, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { conditionPillClass } from '@/lib/utils';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'day' | 'month'>('day');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStartMonth, setFilterStartMonth] = useState('');
  const [filterEndMonth, setFilterEndMonth] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSubCategory, setFilterSubCategory] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<any>(null);
  const [settings, setSettings] = useState<{
    companyName?: string;
    logoUrl?: string;
    primaryColor?: string;
    footerText?: string;
  } | null>(null);

  useEffect(() => {
    fetchReports();
    fetchSettings();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        setFilteredReports(data);
      }
    } catch (error) {
      console.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) setSettings(await res.json());
    } catch {}
  }

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('/') ? `${window.location.origin}${url}` : url;
  };

  const loadImageAsDataUrl = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch image');
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  };

  const addLetterhead = async (doc: jsPDF) => {
    const companyName = settings?.companyName || 'Enerflex Asset';
    const logoUrl = settings?.logoUrl ? getAbsoluteUrl(settings.logoUrl) : getAbsoluteUrl('/logo.png');
    const primary = settings?.primaryColor || '#0E5E7E';

    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(primary);
    doc.rect(0, 0, pageWidth, 10, 'F');

    try {
      const logoDataUrl = await loadImageAsDataUrl(logoUrl);
      const imgFormat = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoDataUrl, imgFormat, 14, 10, 18, 18);
    } catch {}

    doc.setFontSize(14);
    doc.text(companyName, 36, 18);
    doc.setFontSize(10);
    doc.text('Laporan Kondisi Tools', 36, 24);
    doc.setDrawColor(200);
    doc.line(14, 30, doc.internal.pageSize.getWidth() - 14, 30);
  };

  const addFooter = (doc: jsPDF) => {
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

  useEffect(() => {
    let result = reports;
    if (search) {
      result = result.filter((r: any) => 
        r.toolName.toLowerCase().includes(search.toLowerCase()) ||
        r.technicianName.toLowerCase().includes(search.toLowerCase()) ||
        (r.toolCode || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.subCategory || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterCategory) {
      result = result.filter((r: any) => (r.category || '') === filterCategory);
    }
    if (filterSubCategory) {
      result = result.filter((r: any) => (r.subCategory || '') === filterSubCategory);
    }
    if (filterMode === 'day') {
      if (filterStartDate || filterEndDate) {
        const start = filterStartDate ? new Date(`${filterStartDate}T00:00:00`) : null;
        const end = filterEndDate ? new Date(`${filterEndDate}T23:59:59`) : null;
        result = result.filter((r: any) => {
          const t = new Date(r.createdAt).getTime();
          if (start && t < start.getTime()) return false;
          if (end && t > end.getTime()) return false;
          return true;
        });
      }
    } else if (filterStartMonth || filterEndMonth) {
      const monthStart = filterStartMonth ? new Date(`${filterStartMonth}-01T00:00:00`) : null;
      const monthEnd = filterEndMonth
        ? new Date(new Date(`${filterEndMonth}-01T00:00:00`).getFullYear(), new Date(`${filterEndMonth}-01T00:00:00`).getMonth() + 1, 0, 23, 59, 59)
        : null;
      result = result.filter((r: any) => {
        const t = new Date(r.createdAt).getTime();
        if (monthStart && t < monthStart.getTime()) return false;
        if (monthEnd && t > monthEnd.getTime()) return false;
        return true;
      });
    }
    setFilteredReports(result);
  }, [search, filterMode, filterStartDate, filterEndDate, filterStartMonth, filterEndMonth, filterCategory, filterSubCategory, reports]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Enerflex Asset', 14, 18);
    doc.setFontSize(12);
    doc.text('Riwayat Report (Filter)', 14, 24);
    
    const tableColumn = ["No.", "Tanggal", "Nama Tools", "Nama Pelapor", "Kondisi", "Keterangan"];
    const tableRows: any[] = [];

    const sorted = [...(filteredReports as any[])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    sorted.forEach((report: any, idx: number) => {
      const reportData = [
        String(idx + 1),
        format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm'),
        report.toolName,
        report.technicianName,
        report.condition || '-',
        report.description || '-',
      ];
      tableRows.push(reportData);
    });

    (doc as any).autoTable(tableColumn, tableRows, { startY: 30, theme: 'grid' });
    doc.save(`Enerflex_Asset_Riwayat_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportPDFAll = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Enerflex Asset', 14, 18);
    doc.setFontSize(12);
    doc.text('Riwayat Report (Semua)', 14, 24);

    const tableColumn = ["No.", "Tanggal", "Nama Tools", "Nama Pelapor", "Kondisi", "Keterangan"];
    const sorted = [...(reports as any[])].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const tableRows = sorted.map((report: any, idx: number) => [
      String(idx + 1),
      format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm'),
      report.toolName,
      report.technicianName,
      report.condition || '-',
      report.description || '-',
    ]);

    (doc as any).autoTable(tableColumn, tableRows, { startY: 30, theme: 'grid' });
    doc.save(`Enerflex_Asset_Riwayat_Report_ALL_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportPDFByToolSubCategory = () => {
    const doc = new jsPDF();
    doc.text('Laporan Tools (Per Tools & Sub Kategori)', 14, 20);

    const groups = new Map<string, any[]>();
    for (const r of filteredReports as any[]) {
      const key = `${String(r.toolName || '')}||${String(r.subCategory || '')}`;
      const list = groups.get(key) || [];
      list.push(r);
      groups.set(key, list);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'id'));
    let y = 30;
    for (const key of sortedKeys) {
      const [toolName, subCategory] = key.split('||');
      const items = (groups.get(key) || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      doc.setFontSize(11);
      doc.text(`${toolName}${subCategory ? ` (${subCategory})` : ''} - ${items.length} laporan`, 14, y);

      const rows = items.map((r: any) => [
        format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'),
        r.toolCode || '-',
        r.technicianName,
        r.condition,
        r.description || '-',
        r.photoUrl || (Array.isArray(r.photoUrls) && r.photoUrls.length > 0 ? r.photoUrls[0] : '-') || '-',
      ]);

      (doc as any).autoTable(['Tanggal', 'Tool Code', 'Teknisi', 'Kondisi', 'Keterangan', 'Foto'], rows, {
        startY: y + 4,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 20;
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save(`laporan_tools_by_tool_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportPDFByDate = () => {
    const doc = new jsPDF();
    doc.text(filterMode === 'month' ? 'Laporan Tools (Per Bulan)' : 'Laporan Tools (Per Tanggal)', 14, 20);

    const groups = new Map<string, any[]>();
    for (const r of filteredReports as any[]) {
      const key = filterMode === 'month' ? format(new Date(r.createdAt), 'yyyy-MM') : format(new Date(r.createdAt), 'yyyy-MM-dd');
      const list = groups.get(key) || [];
      list.push(r);
      groups.set(key, list);
    }

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    let y = 30;
    for (const key of sortedKeys) {
      const items = (groups.get(key) || []).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      doc.setFontSize(11);
      const labelDate = filterMode === 'month' ? `${key}-01` : key;
      const label = filterMode === 'month'
        ? format(new Date(labelDate), 'MMMM yyyy', { locale: id })
        : format(new Date(labelDate), 'dd MMMM yyyy', { locale: id });
      doc.text(`${label} - ${items.length} laporan`, 14, y);

      const rows = items.map((r: any) => [
        filterMode === 'month' ? format(new Date(r.createdAt), 'dd/MM HH:mm') : format(new Date(r.createdAt), 'HH:mm'),
        r.toolCode || '-',
        r.toolName,
        r.subCategory || '-',
        r.technicianName,
        r.condition,
        r.description || '-',
        r.photoUrl || (Array.isArray(r.photoUrls) && r.photoUrls.length > 0 ? r.photoUrls[0] : '-') || '-',
      ]);

      (doc as any).autoTable([filterMode === 'month' ? 'Tanggal/Jam' : 'Jam', 'Tool Code', 'Tools', 'Sub Kategori', 'Teknisi', 'Kondisi', 'Keterangan', 'Foto'], rows, {
        startY: y + 4,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [240, 240, 240] },
      });

      y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : y + 20;
      if (y > doc.internal.pageSize.getHeight() - 30) {
        doc.addPage();
        y = 20;
      }
    }

    const suffix = filterMode === 'month'
      ? `${filterStartMonth || 'all'}_${filterEndMonth || 'all'}`
      : `${filterStartDate || 'all'}_${filterEndDate || 'all'}`;
    doc.save(`laporan_tools_by_date_${suffix}.pdf`);
  };

  const exportSinglePDF = async (report: any) => {
    const doc = new jsPDF();
    await addLetterhead(doc);
    const photoUrls = Array.isArray(report.photoUrls) && report.photoUrls.length > 0
      ? report.photoUrls.map((u: any) => getAbsoluteUrl(String(u)))
      : report.photoUrl
        ? [getAbsoluteUrl(String(report.photoUrl))]
        : [];
    const rows = [
      ['Tanggal', format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm')],
      ['Tool Code', report.toolCode || '-'],
      ['Tools', report.toolName],
      ['Kategori', report.category || '-'],
      ['Sub Kategori', report.subCategory || '-'],
      ['Teknisi', report.technicianName],
      ['Pemeriksa', report.examinerName || report.technicianName || '-'],
      ['Kondisi', report.condition],
      ['Keterangan', report.description || '-'],
      ['Jumlah Foto', String(photoUrls.length)],
    ];
    (doc as any).autoTable(['Field', 'Value'], rows, { startY: 36, theme: 'grid', styles: { fontSize: 9 } });

    const pageWidth = doc.internal.pageSize.getWidth();
    const afterTableY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : 120;
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Tanda Tangan', 14, afterTableY);
    const signY = afterTableY + 8;
    const colW = (pageWidth - 28) / 3;
    const labels = ['Pelapor', 'Pemeriksa', 'Mengetahui'];
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    for (let i = 0; i < 3; i++) {
      const x = 14 + colW * i;
      doc.text(labels[i], x, signY);
      doc.setDrawColor(156, 163, 175);
      doc.line(x, signY + 22, x + colW - 10, signY + 22);
    }

    for (let i = 0; i < photoUrls.length; i++) {
      const url = String(photoUrls[i] || '');
      if (!url) continue;
      doc.addPage();
      await addLetterhead(doc);
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(`Lampiran Foto (${i + 1}/${photoUrls.length})`, 14, 40);
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
        doc.addImage(dataUrl, imgFormat, 14, 46, w, h);
      } catch {}
    }

    addFooter(doc);
    doc.save(`Laporan_${report.toolCode || report._id}_${format(new Date(report.createdAt), 'yyyy-MM-dd')}.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredReports.map((r: any) => ({
      Tanggal: format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'),
      ToolCode: r.toolCode || '-',
      Tools: r.toolName,
      SubKategori: r.subCategory || '-',
      Teknisi: r.technicianName,
      Kondisi: r.condition,
      Keterangan: r.description || '-',
      Foto: r.photoUrl || (Array.isArray(r.photoUrls) && r.photoUrls.length > 0 ? r.photoUrls[0] : '-') || '-',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    XLSX.writeFile(workbook, `laporan_tools_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const categoryOptions = Array.from(
    new Set((reports as any[]).map((r) => String((r as any).category || '')).filter((v) => v))
  ).sort();

  const monthOptions = Array.from(
    new Set(
      (reports as any[])
        .map((r) => {
          const d = new Date((r as any).createdAt);
          if (Number.isNaN(d.getTime())) return '';
          return format(d, 'yyyy-MM');
        })
        .filter((v) => v),
    ),
  ).sort((a, b) => b.localeCompare(a));

  const subCategoryOptions = Array.from(
    new Set(
      (reports as any[])
        .filter((r) => !filterCategory || String((r as any).category || '') === filterCategory)
        .map((r) => String((r as any).subCategory || ''))
        .filter((v) => v),
    )
  ).sort();

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportPDFByToolSubCategory}
            className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> PDF (Per Tools)
          </button>
          <button
            onClick={exportPDFByDate}
            className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Download className="w-4 h-4" /> PDF (Per Tanggal)
          </button>
          <button onClick={exportPDF} className="bg-error text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> Export PDF (Filter)
          </button>
          <button onClick={exportPDFAll} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> Export PDF (Semua)
          </button>
          <button onClick={exportExcel} className="bg-success text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            placeholder="Cari berdasarkan tools atau teknisi..."
            className="pl-10 w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value as 'day' | 'month')}
            className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600 bg-white"
          >
            <option value="day">Filter Hari</option>
            <option value="month">Filter Bulan</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setFilterSubCategory('');
            }}
            className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600 bg-white"
          >
            <option value="">Semua Kategori</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterSubCategory}
            onChange={(e) => setFilterSubCategory(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600 bg-white"
          >
            <option value="">Semua Sub Kategori</option>
            {subCategoryOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {filterMode === 'day' ? (
            <>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </>
          ) : (
            <>
              <select
                value={filterStartMonth}
                onChange={(e) => setFilterStartMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600 bg-white"
              >
                <option value="">Dari Bulan (Semua)</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={filterEndMonth}
                onChange={(e) => setFilterEndMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600 bg-white"
              >
                <option value="">Sampai Bulan (Semua)</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            onClick={() => {
              setSearch('');
              setFilterCategory('');
              setFilterSubCategory('');
              setFilterStartDate('');
              setFilterEndDate('');
              setFilterStartMonth('');
              setFilterEndMonth('');
            }}
            className="w-full border border-gray-200 rounded-lg p-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Reset Filter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-500">Loading...</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600 text-sm">Tanggal</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Tools</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Teknisi</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Kondisi</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Keterangan</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Foto</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Detail</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">PDF</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report: any) => (
                  <tr key={report._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">{format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="p-4 text-sm font-medium text-gray-800">
                      {report.toolCode && (
                        <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                          {report.toolCode}
                        </span>
                      )}
                      {report.toolName}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{report.technicianName}</td>
                    <td className="p-4">
                      <span className={conditionPillClass(report.condition)}>
                        {report.condition}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{report.description || '-'}</td>
                    <td className="p-4">
                      {(report.photoUrl || (Array.isArray(report.photoUrls) && report.photoUrls.length > 0 ? report.photoUrls[0] : '')) && (
                        <a
                          href={report.photoUrl || report.photoUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium"
                        >
                          <Eye className="w-4 h-4" /> Lihat
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => {
                          setDetailReport(report);
                          setDetailOpen(true);
                        }}
                        className="text-secondary hover:opacity-80 flex items-center gap-1 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4" /> Detail
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => exportSinglePDF(report)}
                        className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium"
                      >
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">Tidak ada laporan ditemukan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {detailOpen && detailReport && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Detail Report</div>
                <div className="font-semibold text-gray-800">
                  {detailReport.toolCode ? (
                    <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                      {detailReport.toolCode}
                    </span>
                  ) : null}
                  {detailReport.toolName}
                </div>
              </div>
              <button
                onClick={() => {
                  setDetailOpen(false);
                  setDetailReport(null);
                }}
                className="text-gray-500 hover:text-gray-700 px-2 py-1"
              >
                Tutup
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-500">Tanggal</div>
                  <div className="text-gray-800">{format(new Date(detailReport.createdAt), 'dd/MM/yyyy HH:mm')}</div>
                  <div className="text-gray-500">Kategori</div>
                  <div className="text-gray-800">{detailReport.category || '-'}</div>
                  <div className="text-gray-500">Sub Kategori</div>
                  <div className="text-gray-800">{detailReport.subCategory || '-'}</div>
                  <div className="text-gray-500">Teknisi</div>
                  <div className="text-gray-800">{detailReport.technicianName || '-'}</div>
                  <div className="text-gray-500">Kondisi</div>
                  <div className="text-gray-800">
                    <span className={conditionPillClass(detailReport.condition)}>{detailReport.condition}</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Keterangan</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{detailReport.description || '-'}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">Foto</div>
                <div className="grid grid-cols-2 gap-2">
                  {(Array.isArray(detailReport.photoUrls) && detailReport.photoUrls.length > 0
                    ? detailReport.photoUrls
                    : detailReport.photoUrl
                      ? [detailReport.photoUrl]
                      : []
                  ).map((u: string) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="block">
                      <img src={u} alt="Report" className="w-full h-40 object-cover rounded-lg border border-gray-100" />
                    </a>
                  ))}
                  {(!detailReport.photoUrl && (!Array.isArray(detailReport.photoUrls) || detailReport.photoUrls.length === 0)) && (
                    <div className="text-sm text-gray-400">Tidak ada foto</div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setDetailOpen(false);
                  setDetailReport(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Tutup
              </button>
              <button
                onClick={() => exportSinglePDF(detailReport)}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Cetak PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
