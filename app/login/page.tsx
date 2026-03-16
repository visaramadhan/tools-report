'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginData) => {
    setLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Email atau password salah');
      } else {
        // Redirect is handled by the middleware/auth logic or we can force it
        // But since redirect: false, we need to manually redirect
        // We can check the session or just refresh
        router.refresh();
        router.push('/'); 
      }
    } catch {
      setError('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="card w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.svg" alt="Asset Report" width={120} height={120} priority />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Tools Report System
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Masuk ke akun anda
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 shadow-sm focus:outline-none transition-all"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className="mt-1 block w-full border border-gray-200 rounded-lg p-2.5 shadow-sm focus:outline-none transition-all"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-lg border border-transparent bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover focus:outline-none disabled:opacity-50 transition-all"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}
