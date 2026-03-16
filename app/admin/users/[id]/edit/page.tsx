'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function EditUserPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch(`/api/users/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setValue('name', data.name);
          setValue('email', data.email);
          setValue('role', data.role);
          setValue('status', data.status);
        } else {
            alert('User tidak ditemukan');
            router.push('/admin/users');
        }
      } catch (error) {
        console.error('Failed to fetch user');
      } finally {
        setFetching(false);
      }
    }
    fetchUser();
  }, [params.id, setValue, router]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      // If password is empty, remove it from data
      if (!data.password) delete data.password;

      const res = await fetch(`/api/users/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/admin/users');
        router.refresh();
      } else {
        alert('Gagal mengubah user');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10">Loading...</div>;

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow mt-10">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
      
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
          <label className="block text-sm font-medium text-gray-700">Password (Kosongkan jika tidak ingin mengubah)</label>
          <input
            type="password"
            {...register('password', { minLength: { value: 6, message: 'Minimal 6 karakter' } })}
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

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('status')}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">Aktif</span>
          </label>
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
