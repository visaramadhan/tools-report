'use client';

import { useSession, signOut } from 'next-auth/react';
import { LogOut, User } from 'lucide-react';

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6 p-4 pb-20">
      <h1 className="text-2xl font-bold">Profil</h1>

      <div className="bg-white rounded-lg shadow p-6 text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-gray-200 rounded-full p-4">
            <User className="w-16 h-16 text-gray-500" />
          </div>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold">{session?.user?.name}</h2>
          <p className="text-gray-500 text-sm">{session?.user?.email}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {session?.user?.role}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center justify-center gap-2 bg-red-600 text-white p-3 rounded-lg hover:bg-red-700 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
}
