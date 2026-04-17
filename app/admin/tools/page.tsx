'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { conditionPillClass } from '@/lib/utils';

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'All' | 'Rusak'>('All');
  const [inTransitByToolId, setInTransitByToolId] = useState<Record<string, string>>({});
  const [verifyingReturn, setVerifyingReturn] = useState<Record<string, boolean>>({});
  const [repairOpen, setRepairOpen] = useState(false);
  const [repairTool, setRepairTool] = useState<any>(null);
  const [repairCondition, setRepairCondition] = useState<'Good' | 'Bad'>('Good');
  const [repairDescription, setRepairDescription] = useState('');
  const [repairFile, setRepairFile] = useState<File | null>(null);
  const [repairSubmitting, setRepairSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchTools();
  }, [search]);

  async function fetchTools() {
    setLoading(true);
    try {
      const [toolsRes, replRes] = await Promise.all([
        fetch(`/api/tools?search=${search}`),
        fetch('/api/replacements?status=OldToolInTransit'),
      ]);
      if (toolsRes.ok) {
        const data = await toolsRes.json();
        setTools(data);
      }
      if (replRes.ok) {
        const data = (await replRes.json()) as any[];
        const map: Record<string, string> = {};
        for (const r of data) {
          if (r?.oldToolId && r?._id) map[String(r.oldToolId)] = String(r._id);
        }
        setInTransitByToolId(map);
      } else {
        setInTransitByToolId({});
      }
    } catch (error) {
      console.error('Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah anda yakin ingin menghapus tools ini?')) return;
    
    try {
      const res = await fetch(`/api/tools/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchTools();
      }
    } catch (error) {
      alert('Gagal menghapus tools');
    }
  }

  const openRepair = (tool: any) => {
    setRepairTool(tool);
    setRepairCondition('Good');
    setRepairDescription('');
    setRepairFile(null);
    setRepairOpen(true);
  };

  const closeRepair = () => {
    setRepairOpen(false);
    setRepairTool(null);
    setRepairSubmitting(false);
    setRepairCondition('Good');
    setRepairDescription('');
    setRepairFile(null);
  };

  const submitRepair = async () => {
    if (!repairTool?._id) return;
    setRepairSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('condition', repairCondition);
      fd.append('description', repairDescription);
      if (repairFile) fd.append('photo', repairFile);

      const res = await fetch(`/api/tools/${repairTool._id}/repair`, { method: 'PUT', body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal update kondisi');
        return;
      }
      await fetchTools();
      closeRepair();
    } finally {
      setRepairSubmitting(false);
    }
  };

  const verifyDamagedReturn = async (toolId: string) => {
    const replacementId = inTransitByToolId[toolId];
    if (!replacementId) {
      alert('Belum ada konfirmasi pengiriman dari teknisi');
      return;
    }
    if (!confirm('Verifikasi pengembalian tools rusak? Pastikan barang sudah diterima di kantor.')) return;

    setVerifyingReturn((p) => ({ ...p, [toolId]: true }));
    try {
      const res = await fetch(`/api/replacements/${replacementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OldReturned' }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal verifikasi pengembalian');
        return;
      }
      await fetchTools();
    } finally {
      setVerifyingReturn((p) => ({ ...p, [toolId]: false }));
    }
  };

  const filteredTools = (tools as any[]).filter((t) => {
    if (filterMode === 'Rusak') return t?.condition === 'Bad';
    return true;
  });

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tools Management</h1>
        <div className="flex flex-wrap gap-2 justify-end">
          <Link href="/admin/tools/riwayat" className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium shadow-sm transition-all">
            Riwayat
          </Link>
          <Link href="/admin/tools/peminjaman" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover text-sm font-medium shadow-sm transition-all">
            Peminjaman
          </Link>
          <Link href="/admin/tools/pengembalian" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover text-sm font-medium shadow-sm transition-all">
            Pengembalian
          </Link>
          <Link href="/admin/tools/penggantian" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover text-sm font-medium shadow-sm transition-all">
            Penggantian
          </Link>
          <Link href="/admin/tools/oper-tools" className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium shadow-sm transition-all">
            Oper Tools
          </Link>
          <Link href="/admin/tools/categories" className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium shadow-sm transition-all">
            Kategori
          </Link>
          <Link href="/admin/tools/create" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover shadow-sm transition-all">
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              placeholder="Cari tools..."
              className="pl-10 w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('All')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                filterMode === 'All'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterMode('Rusak')}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                filterMode === 'Rusak'
                  ? 'bg-error text-white border-error'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tools Rusak
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {filteredTools.map((tool: any) => {
            const isDamaged = tool.condition === 'Bad';
            const isBorrowed = !!tool.isBorrowed;
            const inTransit = !!inTransitByToolId[tool._id];
            const canRepair = isDamaged && !isBorrowed;
            return (
            <div key={tool._id} className="card p-4 flex justify-between items-center hover:shadow-md transition-shadow">
              <div className="flex gap-4 items-center">
                {tool.photoUrl ? (
                  <img src={tool.photoUrl} alt={tool.name} className="w-16 h-16 object-cover rounded-lg border border-gray-100" />
                ) : (
                  <div className="w-16 h-16 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center text-gray-400 text-xs text-center font-medium">No Image</div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800 text-lg">{tool.name}</h3>
                    {tool.toolCode && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-mono border border-gray-200">{tool.toolCode}</span>}
                  </div>
                  <p className="text-sm text-gray-500 font-medium">{tool.category} &gt; {tool.subCategory}</p>
                  {tool.isBorrowed && <div className="text-sm text-gray-600 mt-1">Dipinjam oleh: {tool.currentBorrowerName || '-'}</div>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${tool.status ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {tool.status ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <span className={conditionPillClass(tool.condition)}>
                      {tool.condition || 'Good'}
                    </span>
                    {filterMode === 'Rusak' && isDamaged && isBorrowed && inTransit && (
                      <button
                        onClick={() => verifyDamagedReturn(tool._id)}
                        disabled={!!verifyingReturn[tool._id]}
                        className="text-xs px-3 py-1 rounded-full font-semibold bg-success/10 text-success hover:bg-success/15 disabled:opacity-50"
                      >
                        {verifyingReturn[tool._id] ? 'Proses...' : 'Verifikasi Pengembalian'}
                      </button>
                    )}
                    {filterMode === 'Rusak' && isDamaged && isBorrowed && !inTransit && (
                      <span className="text-xs px-3 py-1 rounded-full font-semibold bg-secondary/10 text-secondary">
                        Menunggu konfirmasi pengiriman
                      </span>
                    )}
                    {canRepair && (
                      <button
                        onClick={() => openRepair(tool)}
                        className="text-xs px-3 py-1 rounded-full font-semibold bg-primary/10 text-primary hover:bg-primary/15"
                      >
                        Perbaikan Selesai
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/tools/${tool._id}/edit`} className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-blue-50 transition-colors">
                  <Edit className="w-5 h-5" />
                </Link>
                <button onClick={() => handleDelete(tool._id)} className="text-error hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
          })}
          {filteredTools.length === 0 && <div className="text-center text-gray-500 mt-8 font-medium">Tidak ada tools ditemukan</div>}
        </div>
      )}

      {repairOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Update kondisi</div>
                <div className="font-semibold text-gray-800">
                  {repairTool?.toolCode ? (
                    <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                      {repairTool.toolCode}
                    </span>
                  ) : null}
                  {repairTool?.name}
                </div>
              </div>
              <button onClick={closeRepair} className="text-gray-500 hover:text-gray-700 px-2 py-1">
                Tutup
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Kondisi</div>
                <select
                  value={repairCondition}
                  onChange={(e) => setRepairCondition(e.target.value as 'Good' | 'Bad')}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                >
                  <option value="Good">Good</option>
                  <option value="Bad">Bad</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Keterangan</div>
                <input
                  value={repairDescription}
                  onChange={(e) => setRepairDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                  placeholder="Contoh: sudah diperbaiki, ganti sparepart..."
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Foto Kondisi</div>
                <input type="file" accept="image/*" onChange={(e) => setRepairFile(e.target.files?.[0] || null)} className="text-sm text-gray-600" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeRepair} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button
                onClick={submitRepair}
                disabled={repairSubmitting}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50"
              >
                {repairSubmitting ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
