'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, LogOut, User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Settings Form
  const { register, handleSubmit, setValue } = useForm();
  
  // Profile Form
  const { 
      register: registerProfile, 
      handleSubmit: handleSubmitProfile, 
      setValue: setValueProfile,
  } = useForm();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch System Settings
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setValue('companyName', data.companyName);
          setValue('primaryColor', data.primaryColor);
          setValue('footerText', data.footerText);
          setValue('emailManagement', data.emailManagement);
        }

        // Set Profile Data from Session (or fetch fresh if needed)
        if (session?.user) {
            setValueProfile('name', session.user.name);
            setValueProfile('email', session.user.email);
        }
      } catch (error) {
        console.error('Failed to fetch data');
      } finally {
        setFetching(false);
      }
    }
    fetchData();
  }, [setValue, setValueProfile, session]);

  const onSettingsSubmit = async (data: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        alert('Pengaturan sistem berhasil disimpan');
      } else {
        alert('Gagal menyimpan pengaturan');
      }
    } catch (error) {
      alert('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const onProfileSubmit = async (data: any) => {
      setProfileLoading(true);
      try {
          const res = await fetch('/api/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
          });

          if (res.ok) {
              alert('Profil berhasil diperbarui. Silakan login ulang untuk melihat perubahan.');
              // Optionally force logout to refresh session
          } else {
              const err = await res.json();
              alert(`Gagal update profil: ${err.error}`);
          }
      } catch (error) {
          alert('Terjadi kesalahan saat update profil');
      } finally {
          setProfileLoading(false);
      }
  };

  const handleLogout = async () => {
      await signOut({ redirect: false });
      router.push('/login');
  };

  if (fetching) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold text-gray-800">Pengaturan</h1>
      
      {/* Profile Section */}
      <div className="card p-6">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Profil Saya
              </h2>
              <button 
                  onClick={handleLogout}
                  className="bg-error/10 text-error hover:bg-error hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              >
                  <LogOut className="w-4 h-4" />
                  Logout
              </button>
          </div>

          <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                      <input
                          {...registerProfile('name', { required: true })}
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                          type="email"
                          {...registerProfile('email', { required: true })}
                          className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          readOnly // Email usually shouldn't be changed easily or needs verification
                      />
                  </div>
              </div>
              
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru (Opsional)</label>
                  <input
                      type="password"
                      {...registerProfile('password', { minLength: 6 })}
                      placeholder="Kosongkan jika tidak ingin mengubah password"
                      className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
              </div>

              <div className="flex justify-end">
                  <button
                      type="submit"
                      disabled={profileLoading}
                      className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 font-medium shadow-sm transition-all"
                  >
                      {profileLoading ? 'Menyimpan...' : 'Simpan Profil'}
                  </button>
              </div>
          </form>
      </div>

      {/* System Settings Section */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6">Pengaturan Sistem</h2>
        
        <form onSubmit={handleSubmit(onSettingsSubmit)} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Branding</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
                <input
                  {...register('companyName')}
                  className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warna Utama</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    {...register('primaryColor')}
                    className="h-10 w-20 p-1 rounded border cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Pilih warna tema aplikasi</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teks Footer</label>
                <input
                  {...register('footerText')}
                  className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-4 uppercase tracking-wider">Notifikasi Email</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Management</label>
              <input
                type="email"
                {...register('emailManagement')}
                placeholder="email@perusahaan.com"
                className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 font-medium shadow-sm transition-all"
            >
              {loading ? 'Menyimpan...' : 'Simpan Pengaturan Sistem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
