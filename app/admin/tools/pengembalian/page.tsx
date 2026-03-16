'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type LoanItem = {
  _id: string;
  borrowerName: string;
  status: 'Borrowed' | 'Returned' | 'PartiallyReturned';
  borrowedAt: string;
  items: Array<{
    toolId: string;
    toolCode: string;
    toolName: string;
    category: string;
    subCategory: string;
    returnedAt?: string;
  }>;
};

type ReturnFormState = Record<
  string,
  {
    condition: 'Good' | 'Bad';
    description: string;
    file?: File;
    submitting?: boolean;
  }
>;

export default function PengembalianPage() {
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [forms, setForms] = useState<ReturnFormState>({});
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  useEffect(() => {
    async function fetchLoans() {
      setLoading(true);
      try {
        const res = await fetch('/api/loans?status=Borrowed');
        const res2 = await fetch('/api/loans?status=PartiallyReturned');
        const list: LoanItem[] = [];
        if (res.ok) list.push(...((await res.json()) as LoanItem[]));
        if (res2.ok) list.push(...((await res2.json()) as LoanItem[]));
        list.sort((a, b) => (a.borrowedAt < b.borrowedAt ? 1 : -1));
        setLoans(list);
      } finally {
        setLoading(false);
      }
    }
    fetchLoans();
  }, []);

  const selectedLoan = useMemo(() => loans.find((l) => l._id === selectedLoanId), [loans, selectedLoanId]);

  const setForm = (toolId: string, patch: Partial<ReturnFormState[string]>) => {
    setForms((prev) => ({
      ...prev,
      [toolId]: {
        condition: prev[toolId]?.condition || 'Good',
        description: prev[toolId]?.description || '',
        file: prev[toolId]?.file,
        submitting: prev[toolId]?.submitting,
        ...patch,
      },
    }));
  };

  const handleReturn = async (toolId: string) => {
    if (!selectedLoan) return;
    const state = forms[toolId] || { condition: 'Good', description: '' };
    setForm(toolId, { submitting: true });
    try {
      const fd = new FormData();
      fd.append('toolId', toolId);
      fd.append('condition', state.condition);
      fd.append('description', state.description || '');
      if (state.file) fd.append('photo', state.file);

      const res = await fetch(`/api/loans/${selectedLoan._id}/return`, {
        method: 'PUT',
        body: fd,
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal mengembalikan');
        return;
      }

      alert('Pengembalian berhasil');

      const refreshed = await Promise.all([
        fetch('/api/loans?status=Borrowed'),
        fetch('/api/loans?status=PartiallyReturned'),
      ]);
      const list: LoanItem[] = [];
      if (refreshed[0].ok) list.push(...((await refreshed[0].json()) as LoanItem[]));
      if (refreshed[1].ok) list.push(...((await refreshed[1].json()) as LoanItem[]));
      list.sort((a, b) => (a.borrowedAt < b.borrowedAt ? 1 : -1));
      setLoans(list);
    } finally {
      setForm(toolId, { submitting: false, file: undefined, description: '' });
    }
  };

  const handleBulkReturn = async () => {
    if (!selectedLoan) return;
    const pending = selectedLoan.items.filter((it) => !it.returnedAt);
    if (pending.length === 0) {
      alert('Semua item sudah kembali');
      return;
    }

    setBulkSubmitting(true);
    try {
      const items = pending.map((it) => {
        const state = forms[it.toolId] || { condition: 'Good', description: '' };
        return {
          toolId: it.toolId,
          condition: state.condition,
          description: state.description || '',
        };
      });

      const res = await fetch(`/api/loans/${selectedLoan._id}/return/bulk`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal bulk return');
        return;
      }

      alert('Bulk pengembalian berhasil');
      const refreshed = await Promise.all([
        fetch('/api/loans?status=Borrowed'),
        fetch('/api/loans?status=PartiallyReturned'),
      ]);
      const list: LoanItem[] = [];
      if (refreshed[0].ok) list.push(...((await refreshed[0].json()) as LoanItem[]));
      if (refreshed[1].ok) list.push(...((await refreshed[1].json()) as LoanItem[]));
      list.sort((a, b) => (a.borrowedAt < b.borrowedAt ? 1 : -1));
      setLoans(list);
      setForms({});
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Pengembalian</h1>
        {selectedLoan && (
          <button
            onClick={handleBulkReturn}
            disabled={bulkSubmitting}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all"
          >
            {bulkSubmitting ? 'Proses...' : 'Kembalikan Semua (Bulk)'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <>
          <div className="card p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Peminjaman</label>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-none transition-all"
            >
              <option value="">-- Pilih --</option>
              {loans.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.borrowerName} - {new Date(l.borrowedAt).toLocaleString()} ({l.status})
                </option>
              ))}
            </select>
          </div>

          {selectedLoan && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 text-sm font-semibold text-gray-600">Tools</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Kondisi</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Foto</th>
                      <th className="p-4 text-sm font-semibold text-gray-600">Keterangan</th>
                      <th className="p-4 text-sm font-semibold text-gray-600 w-36"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedLoan.items.map((it) => {
                      const returned = !!it.returnedAt;
                      const state = forms[it.toolId] || { condition: 'Good', description: '' };
                      return (
                        <tr key={it.toolId} className="border-b border-gray-100">
                          <td className="p-4">
                            <div className="font-medium text-gray-800">
                              <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded mr-2">
                                {it.toolCode}
                              </span>
                              {it.toolName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {it.category} &gt; {it.subCategory}
                            </div>
                          </td>
                          <td className="p-4">
                            <select
                              value={state.condition}
                              onChange={(e) => setForm(it.toolId, { condition: e.target.value as 'Good' | 'Bad' })}
                              disabled={returned}
                              className="w-40 border border-gray-200 rounded-lg p-2 bg-white disabled:bg-gray-50"
                            >
                              <option value="Good">Good</option>
                              <option value="Bad">Bad</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <input
                              type="file"
                              accept="image/*"
                              disabled={returned}
                              onChange={(e) => setForm(it.toolId, { file: e.target.files?.[0] })}
                              className="text-sm text-gray-600"
                            />
                          </td>
                          <td className="p-4">
                            <input
                              value={state.description}
                              onChange={(e) => setForm(it.toolId, { description: e.target.value })}
                              disabled={returned}
                              placeholder="Catatan pengembalian..."
                              className="w-full border border-gray-200 rounded-lg p-2.5 disabled:bg-gray-50"
                            />
                          </td>
                          <td className="p-4">
                            {returned ? (
                              <span className="text-success font-medium text-sm">Sudah kembali</span>
                            ) : (
                              <button
                                onClick={() => handleReturn(it.toolId)}
                                disabled={!!state.submitting}
                                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all"
                              >
                                {state.submitting ? 'Proses...' : 'Kembalikan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
