'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function CreateUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin/users');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal membuat user: ${err.error}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold mb-6">Tambah User Baru</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nama</label>
          <input
            {...register('name', { required: 'Nama wajib diisi' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email', { required: 'Email wajib diisi' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            {...register('password', { required: 'Password wajib diisi', minLength: { value: 6, message: 'Minimal 6 karakter' } })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            {...register('role', { required: 'Role wajib diisi' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
          >
            <option value="technician">Teknisi</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
