'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

type ReportItem = {
  _id: string;
  toolId: string;
  toolCode?: string;
  toolName: string;
  technicianId: string;
  technicianName: string;
  condition: 'Good' | 'Bad';
  description?: string;
  photoUrl?: string;
  replacementId?: string;
  createdAt: string;
};

type ReplacementItem = {
  _id: string;
  reportId: string;
  requesterName: string;
  oldToolId: string;
  oldToolCode: string;
  oldToolName: string;
  newToolId?: string;
  newToolCode?: string;
  newToolName?: string;
  status: string;
  note?: string;
  returnCondition?: 'Good' | 'Bad';
  returnPhotoUrl?: string;
  updatedAt: string;
};

type ToolItem = {
  _id: string;
  toolCode: string;
  name: string;
  status: boolean;
  isBorrowed?: boolean;
};

export default function PenggantianPage() {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<Record<string, boolean>>({});
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [badReports, setBadReports] = useState<ReportItem[]>([]);
  const [replacements, setReplacements] = useState<ReplacementItem[]>([]);
  const [availableTools, setAvailableTools] = useState<ToolItem[]>([]);
  const [statusDraft, setStatusDraft] = useState<Record<string, string>>({});
  const [newToolDraft, setNewToolDraft] = useState<Record<string, string>>({});
  const [returnConditionDraft, setReturnConditionDraft] = useState<Record<string, 'Good' | 'Bad'>>({});
  const [returnDescDraft, setReturnDescDraft] = useState<Record<string, string>>({});
  const [returnFileDraft, setReturnFileDraft] = useState<Record<string, File | undefined>>({});
  const [historyOpen, setHistoryOpen] = useState<Record<string, boolean>>({});
  const [historyByReplacement, setHistoryByReplacement] = useState<Record<string, ReportItem[]>>({});

  const refresh = async () => {
    setLoading(true);
    try {
      const [reportsRes, replRes, toolsRes] = await Promise.all([
        fetch('/api/reports?condition=Bad'),
        fetch('/api/replacements'),
        fetch('/api/tools?available=true'),
      ]);

      if (reportsRes.ok) {
        const data = (await reportsRes.json()) as ReportItem[];
        setBadReports(data);
      }
      if (replRes.ok) {
        const data = (await replRes.json()) as ReplacementItem[];
        setReplacements(data);
      }
      if (toolsRes.ok) {
        const data = (await toolsRes.json()) as ToolItem[];
        setAvailableTools(data.filter((t) => t.status && !t.isBorrowed));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const openReports = useMemo(() => badReports.filter((r) => !r.replacementId), [badReports]);

  const createReplacement = async (reportId: string) => {
    setCreating((p) => ({ ...p, [reportId]: true }));
    try {
      const res = await fetch('/api/replacements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        alert(json.error || 'Gagal membuat penggantian');
        return;
      }
      await refresh();
    } finally {
      setCreating((p) => ({ ...p, [reportId]: false }));
    }
  };

  const updateReplacement = async (replacementId: string) => {
    setUpdating((p) => ({ ...p, [replacementId]: true }));
    try {
      const nextStatus = statusDraft[replacementId] || '';

      if (nextStatus === 'OldReturned') {
        const fd = new FormData();
        fd.append('status', 'OldReturned');
        fd.append('returnCondition', returnConditionDraft[replacementId] || 'Good');
        fd.append('returnDescription', returnDescDraft[replacementId] || '');
        const f = returnFileDraft[replacementId];
        if (f) fd.append('returnPhoto', f);

        const res = await fetch(`/api/replacements/${replacementId}`, { method: 'PUT', body: fd });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          alert(json.error || 'Gagal update');
          return;
        }
      } else {
        const res = await fetch(`/api/replacements/${replacementId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: nextStatus || undefined,
            newToolId: newToolDraft[replacementId] || undefined,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          alert(json.error || 'Gagal update');
          return;
        }
      }

      setReturnFileDraft((p) => ({ ...p, [replacementId]: undefined }));
      await refresh();
    } finally {
      setUpdating((p) => ({ ...p, [replacementId]: false }));
    }
  };

  const toggleHistory = async (replacementId: string, toolId: string) => {
    const next = !historyOpen[replacementId];
    setHistoryOpen((p) => ({ ...p, [replacementId]: next }));
    if (!next) return;
    if (historyByReplacement[replacementId]) return;
    try {
      const res = await fetch(`/api/reports?toolId=${toolId}`);
      if (res.ok) {
        const data = (await res.json()) as ReportItem[];
        setHistoryByReplacement((p) => ({ ...p, [replacementId]: data }));
      }
    } catch {
      setHistoryByReplacement((p) => ({ ...p, [replacementId]: [] }));
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Penggantian Alat</h1>
      </div>

      {loading ? (
        <div className="flex justify-center p-10 text-gray-500">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      ) : (
        <>
          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Report Bad (Belum dibuat penggantian)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="p-4 text-sm font-semibold text-gray-600">Tools</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">User</th>
                    <th className="p-4 text-sm font-semibold text-gray-600">Keterangan</th>
                    <th className="p-4 text-sm font-semibold text-gray-600 w-44"></th>
                  </tr>
                </thead>
                <tbody>
                  {openReports.map((r) => (
                    <tr key={r._id} className="border-b border-gray-100">
                      <td className="p-4">
                        <span className="font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded mr-2">
                          {r.toolCode || '-'}
                        </span>
                        <span className="font-medium text-gray-800">{r.toolName}</span>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{r.technicianName}</td>
                      <td className="p-4 text-sm text-gray-500 max-w-md truncate">{r.description || '-'}</td>
                      <td className="p-4">
                        <button
                          onClick={() => createReplacement(r._id)}
                          disabled={!!creating[r._id]}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all"
                        >
                          {creating[r._id] ? 'Proses...' : 'Buat Penggantian'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {openReports.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">
                        Tidak ada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Daftar Penggantian</h2>
            <div className="space-y-4">
              {replacements.map((repl) => {
                const currentStatus = repl.status;
                const draftStatus = statusDraft[repl._id] || currentStatus;
                const isOldReturned = draftStatus === 'OldReturned';
                const statusText =
                  currentStatus === 'Requested'
                    ? 'Menunggu review admin'
                    : currentStatus === 'Approved'
                      ? 'Tools pengganti akan dikirim'
                      : currentStatus === 'Shipped'
                        ? 'Tools pengganti sedang dikirim'
                        : currentStatus === 'ReplacementReceived'
                          ? 'Tools pengganti diterima teknisi'
                          : currentStatus === 'OldToolInTransit'
                            ? 'Tools lama sedang dikirim'
                            : currentStatus === 'OldReturned'
                              ? 'Tools lama diterima admin'
                              : currentStatus === 'Verified'
                                ? 'Verifikasi admin selesai'
                                : currentStatus === 'Completed'
                                  ? 'Selesai'
                                  : currentStatus === 'Rejected'
                                    ? 'Ditolak'
                                    : currentStatus;
                return (
                  <div key={repl._id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="text-sm text-gray-500 mb-1">User: {repl.requesterName}</div>
                        <div className="font-medium text-gray-800">
                          <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                            {repl.oldToolCode}
                          </span>
                          {repl.oldToolName}
                          {repl.newToolCode && (
                            <span className="ml-3 text-sm text-gray-600">
                              →{' '}
                              <span className="font-mono text-xs bg-white border border-gray-200 px-2 py-0.5 rounded mr-2">
                                {repl.newToolCode}
                              </span>
                              {repl.newToolName}
                            </span>
                          )}
                        </div>
                        {repl.returnPhotoUrl && (
                          <div className="text-sm mt-2">
                            <a className="text-primary hover:text-primary-hover font-medium" href={repl.returnPhotoUrl} target="_blank" rel="noreferrer">
                              Lihat Foto Pengembalian
                            </a>
                          </div>
                        )}
                        <div className="mt-2 text-sm text-gray-600">{statusText}</div>
                        <div className="mt-3">
                          <button
                            onClick={() => toggleHistory(repl._id, repl.oldToolId)}
                            className="text-primary hover:text-primary-hover text-sm font-medium"
                          >
                            {historyOpen[repl._id] ? 'Tutup Riwayat Report' : 'Lihat Riwayat Report'}
                          </button>
                          {historyOpen[repl._id] && (
                            <div className="mt-2 card p-3">
                              {(historyByReplacement[repl._id] || []).length === 0 ? (
                                <div className="text-sm text-gray-500">Tidak ada riwayat.</div>
                              ) : (
                                <div className="space-y-2">
                                  {(historyByReplacement[repl._id] || []).slice(0, 5).map((r) => (
                                    <div key={r._id} className="text-sm">
                                      <div className="text-gray-800 font-medium">
                                        {new Date(r.createdAt).toLocaleString()} - {r.condition}
                                      </div>
                                      {r.description && <div className="text-gray-600">{r.description}</div>}
                                      {r.photoUrl && (
                                        <a className="text-primary hover:text-primary-hover" href={r.photoUrl} target="_blank" rel="noreferrer">
                                          Lihat Foto
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full lg:w-[420px] space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Status</div>
                            <select
                              value={draftStatus}
                              onChange={(e) => setStatusDraft((p) => ({ ...p, [repl._id]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg p-2 bg-white"
                            >
                              <option value="Requested">Review</option>
                              <option value="Approved">Approve (Akan Dikirim)</option>
                              <option value="Shipped">Pengiriman Tools</option>
                              <option value="ReplacementReceived">Diterima Teknisi</option>
                              <option value="OldToolInTransit">Tools Lama Dikirim</option>
                              <option value="OldReturned">Terima Tools Lama</option>
                              <option value="Verified">Verifikasi Admin</option>
                              <option value="Completed">Selesai</option>
                              <option value="Rejected">Ditolak</option>
                            </select>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-700 mb-1">Tools Pengganti</div>
                            <select
                              value={newToolDraft[repl._id] || repl.newToolId || ''}
                              onChange={(e) => setNewToolDraft((p) => ({ ...p, [repl._id]: e.target.value }))}
                              className="w-full border border-gray-200 rounded-lg p-2 bg-white"
                            >
                              <option value="">-- Pilih --</option>
                              {availableTools.map((t) => (
                                <option key={t._id} value={t._id}>
                                  {t.toolCode} - {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {isOldReturned && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">Kondisi Kembali</div>
                              <select
                                value={returnConditionDraft[repl._id] || 'Good'}
                                onChange={(e) =>
                                  setReturnConditionDraft((p) => ({ ...p, [repl._id]: e.target.value as 'Good' | 'Bad' }))
                                }
                                className="w-full border border-gray-200 rounded-lg p-2 bg-white"
                              >
                                <option value="Good">Good</option>
                                <option value="Bad">Bad</option>
                              </select>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700 mb-1">Foto Kembali</div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setReturnFileDraft((p) => ({ ...p, [repl._id]: e.target.files?.[0] }))}
                                className="w-full text-sm text-gray-600"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="text-sm font-medium text-gray-700 mb-1">Keterangan</div>
                              <input
                                value={returnDescDraft[repl._id] || ''}
                                onChange={(e) => setReturnDescDraft((p) => ({ ...p, [repl._id]: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                              />
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => updateReplacement(repl._id)}
                          disabled={!!updating[repl._id]}
                          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover disabled:opacity-50 shadow-sm transition-all w-full"
                        >
                          {updating[repl._id] ? 'Menyimpan...' : 'Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {replacements.length === 0 && <div className="text-center text-gray-500">Belum ada penggantian</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
