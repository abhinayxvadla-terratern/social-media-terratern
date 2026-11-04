'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AdminProvider, useAdmin } from '@/contexts/AdminContext';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminBottomNav } from '@/components/layout/AdminBottomNav';
import { AdminHeader } from '@/components/layout/AdminHeader';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';
  const isBuildPage = pathname === '/admin/pages/build';
  const { user, userRole, signOut } = useAdmin();

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Dedicated full-screen studio layout for Page Builder (no double headers, no bottom nav overlay)
  if (isBuildPage) {
    return (
      <div className="h-screen bg-slate-100 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <AdminSidebar
          userEmail={user?.email}
          userRole={userRole}
          onSignOut={signOut}
        />
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar (1280px / 768px+) */}
      <AdminSidebar
        userEmail={user?.email}
        userRole={userRole}
        onSignOut={signOut}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <AdminHeader
          userEmail={user?.email}
          userRole={userRole}
          onSignOut={signOut}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Phone 360px+) */}
      <AdminBottomNav />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminProvider>
  );
}
