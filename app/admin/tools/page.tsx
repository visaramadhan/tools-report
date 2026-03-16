'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ToolsPage() {
  const [tools, setTools] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTools();
  }, [search]);

  async function fetchTools() {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools?search=${search}`);
      if (res.ok) {
        const data = await res.json();
        setTools(data);
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
          <Link href="/admin/tools/categories" className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 text-sm font-medium shadow-sm transition-all">
            Kategori
          </Link>
          <Link href="/admin/tools/create" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover shadow-sm transition-all">
            <Plus className="w-6 h-6" />
          </Link>
        </div>
      </div>

      <div className="card p-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            placeholder="Cari tools..."
            className="pl-10 w-full border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {tools.map((tool: any) => (
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
                  <div className="mt-2">
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${tool.status ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {tool.status ? 'Aktif' : 'Nonaktif'}
                    </span>
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
          ))}
          {tools.length === 0 && <div className="text-center text-gray-500 mt-8 font-medium">Tidak ada tools ditemukan</div>}
        </div>
      )}
    </div>
  );
}
