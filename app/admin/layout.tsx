'use client';

import { BottomNav } from '@/components/ui/BottomNav';
import { LayoutDashboard, Wrench, ClipboardList, Users, Settings } from 'lucide-react';

const adminNavItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Tools', href: '/admin/tools', icon: Wrench },
  { label: 'Report', href: '/admin/reports', icon: ClipboardList },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20">
      <main className="flex-1 container mx-auto p-4">{children}</main>
      <BottomNav items={adminNavItems} />
    </div>
  );
}
