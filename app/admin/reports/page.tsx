'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, Download, Mail, Eye } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetchReports();
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

  useEffect(() => {
    let result = reports;
    if (search) {
      result = result.filter((r: any) => 
        r.toolName.toLowerCase().includes(search.toLowerCase()) ||
        r.technicianName.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filterDate) {
      result = result.filter((r: any) => r.createdAt.startsWith(filterDate));
    }
    setFilteredReports(result);
  }, [search, filterDate, reports]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Laporan Tools', 14, 20);
    
    const tableColumn = ["Tanggal", "Tools", "Teknisi", "Kondisi", "Keterangan"];
    const tableRows: any[] = [];

    filteredReports.forEach((report: any) => {
      const reportData = [
        format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm'),
        report.toolName,
        report.technicianName,
        report.condition,
        report.description || '-'
      ];
      tableRows.push(reportData);
    });

    (doc as any).autoTable(tableColumn, tableRows, { startY: 30 });
    doc.save(`laporan_tools_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const exportExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredReports.map((r: any) => ({
      Tanggal: format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'),
      Tools: r.toolName,
      Teknisi: r.technicianName,
      Kondisi: r.condition,
      Keterangan: r.description || '-',
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reports");
    XLSX.writeFile(workbook, `laporan_tools_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan</h1>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="bg-error text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm transition-all flex items-center gap-2 text-sm font-medium">
            <Download className="w-4 h-4" /> PDF
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
        <div className="relative">
          <input
            type="date"
            className="w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-gray-600"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
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
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${report.condition === 'Good' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                        {report.condition}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{report.description || '-'}</td>
                    <td className="p-4">
                      {report.photoUrl && (
                        <a href={report.photoUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium">
                          <Eye className="w-4 h-4" /> Lihat
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Tidak ada laporan ditemukan</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
