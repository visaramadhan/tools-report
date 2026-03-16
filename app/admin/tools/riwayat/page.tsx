'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type LoanStatus = 'Borrowed' | 'Returned' | 'PartiallyReturned';

type LoanItem = {
  _id: string;
  borrowerName: string;
  status: LoanStatus;
  borrowedAt: string;
  items: Array<{
    toolId: string;
    toolCode: string;
    toolName: string;
  }>;
};

type StatusFilter = 'All' | LoanStatus;

function isStatusFilter(value: string): value is StatusFilter {
  return value === 'All' || value === 'Borrowed' || value === 'Returned' || value === 'PartiallyReturned';
}

export default function RiwayatPeminjamanPage() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('All');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/loans');
        if (res.ok) setLoans(await res.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loans.filter((l) => {
      const matchQ =
        !q ||
        `${l.borrowerName} ${l.items?.map((i) => i.toolCode).join(' ')}`.toLowerCase().includes(q);
      const matchS = status === 'All' || l.status === status;
      return matchQ && matchS;
    });
  }, [loans, search, status]);

  const exportCSV = () => {
    const rows = [
      ['Tanggal Pinjam', 'Borrower', 'Status', 'Tool Codes', 'Tool Names'].join(','),
      ...filtered.map((l) =>
        [
          new Date(l.borrowedAt).toLocaleString(),
          l.borrowerName,
          l.status,
          l.items?.map((i) => i.toolCode).join('|'),
          l.items?.map((i) => i.toolName).join('|'),
        ].join(',')
      ),
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat-peminjaman-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Riwayat Peminjaman</h1>
        <div className="flex gap-2">
          <select
            value={status}
            onChange={(e) => {
              const next = e.target.value;
              if (isStatusFilter(next)) setStatus(next);
            }}
            className="border border-gray-200 rounded-lg p-2 bg-white"
          >
            <option value="All">Semua</option>
            <option value="Borrowed">Borrowed</option>
            <option value="PartiallyReturned">PartiallyReturned</option>
            <option value="Returned">Returned</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari borrower atau kode"
            className="border border-gray-200 rounded-lg p-2.5"
          />
          <button onClick={exportCSV} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm">
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-sm font-semibold text-gray-600">Tanggal</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Borrower</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Items</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l._id} className="border-b border-gray-100">
                    <td className="p-4 text-sm text-gray-600">{new Date(l.borrowedAt).toLocaleString()}</td>
                    <td className="p-4 text-sm font-medium text-gray-800">{l.borrowerName}</td>
                    <td className="p-4">
                      <span className="text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-700">
                        {l.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700">
                      {l.items?.map((it) => (
                        <div key={it.toolId}>
                          <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                            {it.toolCode}
                          </span>
                          {it.toolName}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      Tidak ada data
                    </td>
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
