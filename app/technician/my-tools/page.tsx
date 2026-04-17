'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';

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
  returnPhotoUrl?: string;
};

type TechnicianItem = { _id: string; name: string };

type TransferItem = {
  _id: string;
  toolCode: string;
  toolName: string;
  fromTechnicianName: string;
  toTechnicianName: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
};

export default function MyToolsPage() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [returning, setReturning] = useState<Record<string, boolean>>({});
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<TransferItem[]>([]);
  const [operOpen, setOperOpen] = useState(false);
  const [operTool, setOperTool] = useState<{ toolId: string; toolCode: string; toolName: string } | null>(null);
  const [operToTechnicianId, setOperToTechnicianId] = useState('');
  const [operCondition, setOperCondition] = useState<'Good' | 'Bad'>('Good');
  const [operDescription, setOperDescription] = useState('');
  const [operFile, setOperFile] = useState<File | null>(null);
  const [operSubmitting, setOperSubmitting] = useState(false);
  const [accepting, setAccepting] = useState<Record<string, boolean>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const [lRes, rRes, techRes, incomingRes] = await Promise.all([
        fetch('/api/loans/mine'),
        fetch('/api/replacements'),
        fetch('/api/technicians'),
        fetch('/api/transfers?type=incoming&status=Pending'),
      ]);
      if (lRes.ok) setLoans(await lRes.json());
      if (rRes.ok) setReplacements(await rRes.json());
      if (techRes.ok) setTechnicians(await techRes.json());
      if (incomingRes.ok) setIncomingTransfers(await incomingRes.json());
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

  const replacementByToolId = useMemo(() => {
    const map = new Map<string, ReplacementItem>();
    for (const r of activeReplacements) {
      map.set(r.oldToolId, r);
    }
    return map;
  }, [activeReplacements]);

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

  const returnDamaged = async (replacementId: string, form: HTMLFormElement) => {
    setReturning((p) => ({ ...p, [replacementId]: true }));
    try {
      const fd = new FormData(form);
      const res = await fetch(`/api/replacements/${replacementId}/return-damaged`, { method: 'PUT', body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal pengembalian');
        return;
      }
      alert('Pengembalian terkirim, menunggu verifikasi admin');
      form.reset();
      await refresh();
    } finally {
      setReturning((p) => ({ ...p, [replacementId]: false }));
    }
  };

  const openOper = (tool: { toolId: string; toolCode: string; toolName: string }) => {
    setOperTool(tool);
    setOperToTechnicianId(technicians[0]?._id || '');
    setOperCondition('Good');
    setOperDescription('');
    setOperFile(null);
    setOperOpen(true);
  };

  const closeOper = () => {
    setOperOpen(false);
    setOperTool(null);
    setOperSubmitting(false);
  };

  const submitOper = async () => {
    if (!operTool) return;
    if (!operToTechnicianId) {
      alert('Pilih teknisi tujuan');
      return;
    }
    setOperSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('toolId', operTool.toolId);
      fd.append('toTechnicianId', operToTechnicianId);
      fd.append('condition', operCondition);
      fd.append('description', operDescription);
      if (operFile) fd.append('photo', operFile);
      const res = await fetch('/api/transfers', { method: 'POST', body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal Oper Tools');
        return;
      }
      alert('Oper Tools terkirim, menunggu konfirmasi teknisi tujuan');
      closeOper();
      await refresh();
    } finally {
      setOperSubmitting(false);
    }
  };

  const acceptTransfer = async (transferId: string, form: HTMLFormElement) => {
    setAccepting((p) => ({ ...p, [transferId]: true }));
    try {
      const fd = new FormData(form);
      fd.append('condition', (fd.get('condition') as string) || 'Good');
      const res = await fetch(`/api/transfers/${transferId}/accept`, { method: 'PUT', body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal terima tools');
        return;
      }
      alert('Tools diterima');
      form.reset();
      await refresh();
    } finally {
      setAccepting((p) => ({ ...p, [transferId]: false }));
    }
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
            <h2 className="text-lg font-bold text-gray-800 mb-4">Permintaan Terima Tools</h2>
            <div className="space-y-3">
              {incomingTransfers.map((t) => (
                <div key={t._id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-sm text-gray-600">
                      {format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm')} - Dari {t.fromTechnicianName}
                    </div>
                    {t.photoUrl && (
                      <a href={t.photoUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium">
                        <Eye className="w-4 h-4" /> Lihat Foto
                      </a>
                    )}
                  </div>
                  <div className="mt-1 font-medium text-gray-800">
                    <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">{t.toolCode}</span>
                    {t.toolName}
                  </div>
                  {t.description && <div className="mt-1 text-sm text-gray-600">Keterangan: {t.description}</div>}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      acceptTransfer(t._id, e.currentTarget);
                    }}
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    <select name="condition" className="border border-gray-200 rounded-lg p-2 bg-white">
                      <option value="Good">Good</option>
                      <option value="Bad">Bad</option>
                    </select>
                    <input name="description" placeholder="Keterangan terima (opsional)" className="border border-gray-200 rounded-lg p-2 flex-1 min-w-[180px]" />
                    <input name="photo" type="file" accept="image/*" className="text-sm" />
                    <button
                      disabled={!!accepting[t._id]}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm disabled:opacity-50"
                    >
                      {accepting[t._id] ? 'Proses...' : 'Terima Tools'}
                    </button>
                  </form>
                </div>
              ))}
              {incomingTransfers.length === 0 && <div className="text-gray-500">Tidak ada</div>}
            </div>
          </div>

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
                  <div className="mt-3">
                    <button onClick={() => openOper(it)} className="bg-secondary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm text-sm font-medium">
                      Oper Tools
                    </button>
                  </div>
                  {(() => {
                    const repl = replacementByToolId.get(it.toolId);
                    if (!repl) return null;
                    if (repl.status === 'Requested') {
                      return (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            returnDamaged(repl._id, e.currentTarget);
                          }}
                          className="mt-3 flex flex-wrap items-center gap-2"
                        >
                          <input name="description" placeholder="Keterangan pengembalian (opsional)" className="border border-gray-200 rounded-lg p-2 flex-1 min-w-[200px]" />
                          <input name="photo" type="file" accept="image/*" className="text-sm" />
                          <button
                            disabled={!!returning[repl._id]}
                            className="bg-error text-white px-4 py-2 rounded-lg hover:bg-opacity-90 shadow-sm disabled:opacity-50"
                          >
                            {returning[repl._id] ? 'Proses...' : 'Pengembalian'}
                          </button>
                        </form>
                      );
                    }
                    if (repl.status === 'OldToolInTransit') {
                      return <div className="mt-3 text-sm text-gray-600">Barang sedang dikirim, menunggu verifikasi admin</div>;
                    }
                    if (repl.status === 'OldReturned') {
                      return <div className="mt-3 text-sm text-gray-600">Pengembalian sudah diverifikasi admin</div>;
                    }
                    return null;
                  })()}
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

      {operOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Ubah Peminjam (Oper Tools)</div>
                <div className="font-semibold text-gray-800">
                  {operTool?.toolCode ? (
                    <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">{operTool.toolCode}</span>
                  ) : null}
                  {operTool?.toolName}
                </div>
              </div>
              <button onClick={closeOper} className="text-gray-500 hover:text-gray-700 px-2 py-1">
                Tutup
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Teknisi Tujuan</div>
                <select
                  value={operToTechnicianId}
                  onChange={(e) => setOperToTechnicianId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                >
                  {technicians.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Kondisi</div>
                <select value={operCondition} onChange={(e) => setOperCondition(e.target.value as 'Good' | 'Bad')} className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  <option value="Good">Good</option>
                  <option value="Bad">Bad</option>
                </select>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Keterangan</div>
                <input
                  value={operDescription}
                  onChange={(e) => setOperDescription(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                  placeholder="Contoh: pindah lokasi kerja..."
                />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-700 mb-1">Foto</div>
                <input type="file" accept="image/*" onChange={(e) => setOperFile(e.target.files?.[0] || null)} className="text-sm text-gray-600" />
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={closeOper} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={submitOper} disabled={operSubmitting} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-50">
                {operSubmitting ? 'Mengirim...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
