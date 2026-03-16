'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';

export default function CreateToolPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const selectedCategory = watch('category');

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (error) {
        console.error('Failed to fetch categories');
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
      async function fetchSubCategories() {
          if (!selectedCategory) {
              setSubCategories([]);
              return;
          }
          
          // Find category ID from name
          const cat: any = categories.find((c: any) => c.name === selectedCategory);
          if (!cat) return;

          try {
              const res = await fetch(`/api/subcategories?categoryId=${cat._id}`);
              if (res.ok) {
                  setSubCategories(await res.json());
              }
          } catch (error) {
              console.error('Failed to fetch subcategories');
          }
      }
      fetchSubCategories();
  }, [selectedCategory, categories]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('category', data.category);
      formData.append('subCategory', data.subCategory);
      formData.append('year', data.year);
      formData.append('description', data.description || '');
      formData.append('condition', data.condition);
      formData.append('status', data.status);
      
      if (data.photo && data.photo.length > 0) {
        formData.append('photo', data.photo[0]);
      }

      const res = await fetch('/api/tools', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.push('/admin/tools');
        router.refresh();
      } else {
        const err = await res.json();
        alert(`Gagal membuat tools: ${err.error}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-2xl mx-auto p-6 mt-6 mb-20">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Tambah Tools Baru</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Kategori</label>
              <select
                {...register('category', { required: 'Kategori wajib diisi' })}
                className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white"
              >
                <option value="">-- Pilih Kategori --</option>
                {categories.map((cat: any) => (
                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Sub Kategori</label>
              <select
                {...register('subCategory', { required: 'Sub Kategori wajib diisi' })}
                className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-white disabled:bg-gray-50"
                disabled={!selectedCategory}
              >
                <option value="">-- Pilih Sub Kategori --</option>
                {subCategories.map((sub: any) => (
                  <option key={sub._id} value={sub.name}>{sub.name} ({sub.prefix})</option>
                ))}
              </select>
              {errors.subCategory && <p className="text-red-500 text-xs mt-1">{errors.subCategory.message as string}</p>}
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Tahun Pengadaan</label>
            <input
                type="number"
                {...register('year', { required: 'Tahun wajib diisi', min: 2000, max: 2100 })}
                defaultValue={new Date().getFullYear()}
                className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message as string}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
          <textarea
            {...register('description')}
            rows={3}
            className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Kondisi Awal</label>
            <div className="mt-2 flex gap-4">
                <label className="inline-flex items-center">
                    <input
                        type="radio"
                        value="Good"
                        {...register('condition', { required: true })}
                        defaultChecked
                        className="form-radio text-green-600"
                    />
                    <span className="ml-2">Good</span>
                </label>
                <label className="inline-flex items-center">
                    <input
                        type="radio"
                        value="Bad"
                        {...register('condition', { required: true })}
                        className="form-radio text-red-600"
                    />
                    <span className="ml-2">Bad</span>
                </label>
            </div>
        </div>

        <div>
            <label className="block text-sm font-medium text-gray-700">Foto Tools</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md bg-white">
            <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    {...register('photo', {
                        onChange: (e) => {
                            console.log('File selected:', e.target.files);
                        }
                    })}
                    />
                </label>
                <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
            </div>
            </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('status')}
              defaultChecked={true}
              className="rounded border-gray-300 text-primary shadow-sm focus:ring-2 focus:ring-primary"
            />
            <span className="ml-2 text-sm text-gray-600">Aktif</span>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-all"
          >
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>
    </div>
  );
}
