'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function TechnicianDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!session?.user?.id) return;
      
      try {
        // We can create a specific endpoint or reuse reports endpoint with filtering
        // Ideally a specific stats endpoint for technician is better
        // For now, let's fetch all reports for this technician and calculate locally
        // or add query params to stats endpoint
        
        // Let's use the reports endpoint to count
        const res = await fetch(`/api/reports?technicianId=${session.user.id}`);
        if (res.ok) {
          const reports = await res.json();
          
          const today = new Date();
          today.setHours(0,0,0,0);
          
          const thisMonth = new Date();
          thisMonth.setDate(1);
          thisMonth.setHours(0,0,0,0);
          
          const todayCount = reports.filter((r: any) => new Date(r.createdAt) >= today).length;
          const monthCount = reports.filter((r: any) => new Date(r.createdAt) >= thisMonth).length;
          const goodCount = reports.filter((r: any) => r.condition === 'Good').length;
          const badCount = reports.filter((r: any) => r.condition === 'Bad').length;
          
          setStats({
            today: todayCount,
            month: monthCount,
            good: goodCount,
            bad: badCount
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    }
    
    if (session) fetchStats();
  }, [session]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Halo, {session?.user?.name}</h1>
        <Link href="/technician/create-report" className="bg-blue-600 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-blue-700">
          <PlusCircle className="w-5 h-5" />
          <span>Buat Laporan</span>
        </Link>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Hari Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.today || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-gray-500 uppercase">Bulan Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.month || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-green-700 uppercase">Kondisi Baik</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">{stats?.good || 0}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-red-700 uppercase">Kondisi Rusak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800">{stats?.bad || 0}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Aktivitas Terbaru</h2>
        {/* We could list recent reports here */}
        <div className="text-sm text-gray-500">Belum ada aktivitas terbaru.</div>
      </div>
    </div>
  );
}
