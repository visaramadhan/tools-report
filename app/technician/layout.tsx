'use client';

import { BottomNav } from '@/components/ui/BottomNav';
import { LayoutDashboard, PlusCircle, History, User } from 'lucide-react';

const techNavItems = [
  { label: 'Dashboard', href: '/technician/dashboard', icon: LayoutDashboard },
  { label: 'Buat Report', href: '/technician/create-report', icon: PlusCircle },
  { label: 'History', href: '/technician/history', icon: History },
  { label: 'Profile', href: '/technician/profile', icon: User },
];

export default function TechnicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-20">
      <main className="flex-1 container mx-auto p-4">{children}</main>
      <BottomNav items={techNavItems} />
    </div>
  );
}
