'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type LoanItem = {
  _id: string;
  items: Array<{
    toolId: string;
    toolCode: string;
    toolName: string;
    category: string;
    subCategory: string;
    returnedAt?: string;
  }>;
};

type ReplacementItem = {
  _id: string;
  oldToolId: string;
  oldToolCode: string;
  oldToolName: string;
  newToolId?: string;
  newToolCode?: string;
  newToolName?: string;
  status: string;
};

export default function MyToolsPage() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [lRes, rRes] = await Promise.all([fetch('/api/loans/mine'), fetch('/api/replacements')]);
      if (lRes.ok) setLoans(await lRes.json());
      if (rRes.ok) setReplacements(await rRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const activeItems = useMemo(
    () =>
      loans
        .flatMap((l) => l.items)
        .filter((it) => !it.returnedAt),
    [loans]
  );

  const activeReplacements = useMemo(
    () => replacements.filter((r) => r.status !== 'Completed' && r.status !== 'Rejected'),
    [replacements]
  );

  const acceptNew = async (id: string) => {
    const res = await fetch(`/api/replacements/${id}/accept`, { method: 'PUT' });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Gagal menerima');
      return;
    }
    alert('Alat baru diterima');
    await refresh();
  };

  const returnOld = async (id: string, toolId: string, form: HTMLFormElement) => {
    const fd = new FormData(form);
    fd.append('condition', (fd.get('condition') as string) || 'Good');
    const res = await fetch(`/api/replacements/${id}/return-old`, { method: 'PUT', body: fd });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Gagal mengembalikan');
      return;
    }
    alert('Alat lama dikembalikan');
    form.reset();
    await refresh();
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Tools Saya</h1>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Sedang Dipinjam</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {activeItems.map((it) => (
                <div key={it.toolId} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="font-medium text-gray-800">
                    <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                      {it.toolCode}
                    </span>
                    {it.toolName}
                  </div>
                  <div className="text-sm text-gray-500">{it.category} &gt; {it.subCategory}</div>
                </div>
              ))}
              {activeItems.length === 0 && <div className="text-gray-500">Tidak ada</div>}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Penukaran Alat</h2>
            <div className="space-y-4">
              {activeReplacements.map((r) => (
                <div key={r._id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="font-medium text-gray-800">
                    Lama:{' '}
                    <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                      {r.oldToolCode}
                    </span>
                    {r.oldToolName}
                  </div>
                  {r.newToolCode && (
                    <div className="text-gray-700 mt-1">
                      Baru:{' '}
                      <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                        {r.newToolCode}
                      </span>
                      {r.newToolName}
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-600">
                    {r.status === 'Requested' && 'Menunggu review admin'}
                    {r.status === 'Approved' && 'Tools pengganti akan dikirim'}
                    {r.status === 'Shipped' && 'Tools pengganti sedang dikirim'}
                    {r.status === 'ReplacementReceived' && 'Silakan kirim tools lama'}
                    {r.status === 'OldToolInTransit' && 'Tools lama sedang dikirim'}
                    {r.status === 'OldReturned' && 'Tools lama diterima admin, menunggu verifikasi'}
                    {r.status === 'Verified' && 'Verifikasi admin selesai, menunggu selesai'}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.status === 'Shipped' && (
                      <button
                        onClick={() => acceptNew(r._id)}
                        className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm"
                      >
                        Terima Alat Baru
                      </button>
                    )}
                    {r.status === 'ReplacementReceived' && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          returnOld(r._id, r.oldToolId, e.currentTarget);
                        }}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <select name="condition" className="border border-gray-200 rounded-lg p-2 bg-white">
                          <option value="Good">Good</option>
                          <option value="Bad">Bad</option>
                        </select>
                        <input name="description" placeholder="Keterangan" className="border border-gray-200 rounded-lg p-2" />
                        <input name="photo" type="file" accept="image/*" className="text-sm" />
                        <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm">
                          Kirim Tools Lama
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
              {activeReplacements.length === 0 && <div className="text-gray-500">Tidak ada proses penukaran</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
