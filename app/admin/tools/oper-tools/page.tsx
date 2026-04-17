'use client';

import { useEffect, useState } from 'react';
import { Loader2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { conditionPillClass } from '@/lib/utils';

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
  acceptedAt?: string;
  createdAt: string;
};

export default function OperToolsPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransferItem[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/transfers');
      if (res.ok) {
        const data = (await res.json()) as TransferItem[];
        setItems(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Oper Tools</h1>
        <button onClick={refresh} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover shadow-sm transition-all text-sm font-medium">
          Refresh
        </button>
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
                  <th className="p-4 text-sm font-semibold text-gray-600">Tools</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Dari</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Ke</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Kondisi</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Keterangan</th>
                  <th className="p-4 text-sm font-semibold text-gray-600">Foto</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t._id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600">{format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm')}</td>
                    <td className="p-4 text-sm text-gray-800">
                      <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                        {t.toolCode}
                      </span>
                      {t.toolName}
                    </td>
                    <td className="p-4 text-sm text-gray-600">{t.fromTechnicianName}</td>
                    <td className="p-4 text-sm text-gray-600">{t.toTechnicianName}</td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-semibold ${
                          t.status === 'Accepted'
                            ? 'bg-success/10 text-success'
                            : t.status === 'Rejected'
                              ? 'bg-error/10 text-error'
                              : 'bg-secondary/10 text-secondary'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={conditionPillClass(t.condition)}>
                        {t.condition}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 max-w-xs truncate">{t.description || '-'}</td>
                    <td className="p-4">
                      {t.photoUrl ? (
                        <a href={t.photoUrl} target="_blank" rel="noreferrer" className="text-primary hover:text-primary-hover flex items-center gap-1 text-sm font-medium">
                          <Eye className="w-4 h-4" /> Lihat
                        </a>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-500">
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
