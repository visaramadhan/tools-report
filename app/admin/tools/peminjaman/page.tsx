'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type UserItem = {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: boolean;
};

type ToolItem = {
  _id: string;
  toolCode: string;
  name: string;
  category: string;
  subCategory: string;
  status: boolean;
  isBorrowed?: boolean;
};

export default function PeminjamanPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedToolIds, setSelectedToolIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [usersRes, toolsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/tools?available=true'),
        ]);

        if (usersRes.ok) {
          const data = (await usersRes.json()) as UserItem[];
          setUsers(data.filter((u) => u.status && u.role !== 'admin'));
        }
        if (toolsRes.ok) {
          const data = (await toolsRes.json()) as ToolItem[];
          setTools(data.filter((t) => t.status && !t.isBorrowed));
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredTools = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter((t) => `${t.toolCode} ${t.name} ${t.category} ${t.subCategory}`.toLowerCase().includes(q));
  }, [search, tools]);

  const selectedCount = useMemo(() => Object.values(selectedToolIds).filter(Boolean).length, [selectedToolIds]);

  const toggleTool = (toolId: string) => {
    setSelectedToolIds((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      alert('Pilih user terlebih dahulu');
      return;
    }
    const toolIds = Object.entries(selectedToolIds)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (toolIds.length === 0) {
      alert('Pilih minimal 1 tools');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrowerId: selectedUserId, toolIds }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        alert(err.error || 'Gagal membuat peminjaman');
        return;
      }

      alert('Peminjaman berhasil dibuat');
      setSelectedToolIds({});
      const toolsRes = await fetch('/api/tools?available=true');
      if (toolsRes.ok) {
        const data = (await toolsRes.json()) as ToolItem[];
        setTools(data.filter((t) => t.status && !t.isBorrowed));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Peminjaman</h1>
        <button
          onClick={handleSubmit}
          disabled={submitting || loading}
          className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all"
        >
          {submitting ? 'Menyimpan...' : `Simpan (${selectedCount})`}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <>
          <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-none transition-all"
              >
                <option value="">-- Pilih User --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari Tools</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari berdasarkan kode/nama/kategori..."
                className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-sm font-semibold text-gray-600 w-12"></th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Kode</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Nama</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Kategori</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTools.map((t) => (
                    <tr key={t._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={!!selectedToolIds[t._id]}
                          onChange={() => toggleTool(t._id)}
                          className="rounded border-gray-300 text-primary shadow-sm"
                        />
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-700">{t.toolCode}</td>
                      <td className="p-4 text-sm font-medium text-gray-800">{t.name}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {t.category} &gt; {t.subCategory}
                      </td>
                    </tr>
                  ))}
                  {filteredTools.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-gray-500">
                        Tidak ada tools tersedia
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

