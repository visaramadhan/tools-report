'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';

const reportSchema = z.object({
  toolId: z.string().min(1, 'Pilih tools'),
  condition: z.enum(['Good', 'Bad']),
  description: z.string().optional(),
  photo: z.any().optional(),
}).superRefine((data, ctx) => {
  if (data.condition === 'Bad') {
    if (!data.description || data.description.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Keterangan wajib diisi jika kondisi rusak',
        path: ['description'],
      });
    }
    if (!data.photo || data.photo.length === 0) {
       ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Foto wajib diupload jika kondisi rusak',
        path: ['photo'],
      });
    }
  }
});

type ReportData = z.infer<typeof reportSchema>;

type ToolItem = {
  _id: string;
  toolCode?: string;
  name: string;
  category: string;
};

export default function CreateReportPage() {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<ReportData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
        condition: 'Good',
    }
  });

  const condition = watch('condition');

  useEffect(() => {
    async function fetchTools() {
      try {
        const res = await fetch('/api/tools/mine');
        if (res.ok) {
          const data = await res.json();
          setTools(data);
        }
      } catch (error) {
        console.error('Failed to fetch tools');
      }
    }
    fetchTools();
  }, []);

  const onSubmit = async (data: ReportData) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('toolId', data.toolId);
      formData.append('condition', data.condition);
      if (data.description) formData.append('description', data.description);
      if (data.photo && data.photo.length > 0) {
        formData.append('photo', data.photo[0]);
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        alert('Laporan berhasil dibuat!');
        router.push('/technician/history');
        router.refresh();
      } else {
        const errorData = await res.json();
        alert(`Gagal membuat laporan: ${errorData.error}`);
      }
    } catch (error) {
      alert('Terjadi kesalahan saat mengirim laporan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card max-w-md mx-auto p-6 mt-6 mb-20">
      <h1 className="text-xl font-bold mb-6 text-gray-800">Buat Laporan Baru</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Pilih Tools</label>
          <select
            {...register('toolId')}
            className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-none transition-all"
          >
            <option value="">-- Pilih Tools --</option>
            {tools.map((tool) => (
              <option key={tool._id} value={tool._id}>
                {tool.toolCode ? `${tool.toolCode} - ` : ''}{tool.name} ({tool.category})
              </option>
            ))}
          </select>
          {errors.toolId && <p className="text-red-500 text-xs mt-1">{errors.toolId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Kondisi</label>
          <div className="mt-2 flex gap-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="Good"
                {...register('condition')}
                className="form-radio text-primary"
              />
              <span className="ml-2">Good</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                value="Bad"
                {...register('condition')}
                className="form-radio text-red-600"
              />
              <span className="ml-2">Bad</span>
            </label>
          </div>
          {errors.condition && <p className="text-red-500 text-xs mt-1">{errors.condition.message}</p>}
        </div>

        {condition === 'Bad' && (
          <div className="space-y-4 p-4 bg-red-50 rounded-md border border-red-100">
             <div>
              <label className="block text-sm font-medium text-gray-700">Keterangan Kerusakan</label>
              <textarea
                {...register('description')}
                rows={3}
                placeholder="Jelaskan kerusakan yang terjadi..."
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2"
              />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Foto Kerusakan</label>
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
                        {...register('photo')}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              </div>
               {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo.message as string}</p>}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Kirim Laporan'}
        </button>
      </form>
    </div>
  );
}
