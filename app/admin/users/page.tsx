'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Apakah anda yakin ingin menghapus user ini?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (error) {
      alert('Gagal menghapus user');
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <Link href="/admin/users/create" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-hover shadow-sm transition-all">
          <Plus className="w-6 h-6" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center p-8 text-gray-500">Loading...</div>
      ) : (
        <div className="grid gap-4">
          {users.map((user: any) => (
            <div key={user._id} className="card p-4 flex justify-between items-center hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-full">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{user.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                  <div className="flex gap-2">
                    <span className="text-xs px-3 py-1 rounded-full bg-secondary/10 text-secondary font-semibold uppercase">{user.role}</span>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold ${user.status ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {user.status ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/users/${user._id}/edit`} className="text-primary hover:text-primary-hover p-2 rounded-full hover:bg-blue-50 transition-colors">
                  <Edit className="w-5 h-5" />
                </Link>
                <button onClick={() => handleDelete(user._id)} className="text-error hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <div className="text-center text-gray-500 mt-8 font-medium">Tidak ada user ditemukan</div>}
        </div>
      )}
    </div>
  );
}
