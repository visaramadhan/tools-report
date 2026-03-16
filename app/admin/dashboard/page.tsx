'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (!stats) return <div>Failed to load stats</div>;

  const monthlyData = stats.monthlyReports.map((item: any) => ({
    name: item._id,
    count: item.count,
  }));

  const techData = stats.technicianReports.map((item: any) => ({
    name: item._id,
    count: item.count,
  }));

  const categoryData = stats.categoryReports.map((item: any) => ({
    name: item._id,
    value: item.count,
  }));

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Tools</div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalTools}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Total Reports</div>
          <div className="text-3xl font-bold text-gray-800">{stats.totalReports}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Report Hari Ini</div>
          <div className="text-3xl font-bold text-gray-800">{stats.reportsToday}</div>
        </div>
        <div className="card p-6">
          <div className="text-sm font-medium text-gray-500 mb-2">Kondisi Tools</div>
          <div className="flex gap-4 items-center">
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-success"></div>
                  <span className="text-success font-bold text-xl">{stats.reportsGood}</span>
              </div>
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-error"></div>
                  <span className="text-error font-bold text-xl">{stats.reportsBad}</span>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Laporan Bulanan</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Laporan per Kategori</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-800">Laporan per Teknisi</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
