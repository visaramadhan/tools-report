'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Calendar } from 'lucide-react';
import { conditionPillClass } from '@/lib/utils';

export default function HistoryPage() {
  const { data: session } = useSession();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/reports?technicianId=${session.user.id}`);
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (error) {
        console.error('Failed to fetch reports');
      } finally {
        setLoading(false);
      }
    }
    if (session) fetchReports();
  }, [session]);

  if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-xl font-bold text-gray-800">Riwayat Laporan</h1>

      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="text-center text-gray-500 py-10">Belum ada laporan.</div>
        ) : (
          reports.map((report: any) => (
            <div key={report._id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {report.toolCode && (
                      <span className="mr-2 font-mono text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded text-gray-700">
                        {report.toolCode}
                      </span>
                    )}
                    {report.toolName}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(report.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <span className={conditionPillClass(report.condition)}>
                  {report.condition}
                </span>
              </div>
              
              {report.description && (
                <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {report.description}
                </p>
              )}
              
              {report.photoUrl && (
                <div className="mt-2">
                  <img src={report.photoUrl} alt="Kerusakan" className="h-20 w-20 object-cover rounded-lg" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
