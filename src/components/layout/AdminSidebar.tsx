'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  TrendingUp,
  FolderDown,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { TerraTernLogo } from '../ui/TerraTernLogo';
import { RoleBadge } from '../ui/Badge';
import { AdminRole } from '@/lib/types';
import { useAdmin } from '@/contexts/AdminContext';

interface AdminSidebarProps {
  userEmail?: string;
  userRole?: AdminRole;
  onSignOut: () => void;
  forceCollapse?: boolean;
}

export function AdminSidebar({
  userEmail = 'abhinay.vadla@terratern.com',
  userRole = 'viewer',
  onSignOut,
  forceCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useAdmin();

  if (forceCollapse || sidebarCollapsed) {
    return null;
  }

  const navItems = [
    {
      name: 'Overview',
      href: '/admin',
      exact: true,
      icon: LayoutDashboard,
    },
    {
      name: 'Pages',
      href: '/admin/pages',
      exact: false,
      icon: FileText,
    },
    {
      name: 'Leads',
      href: '/admin/leads',
      exact: false,
      icon: Users,
    },
    {
      name: 'Traction',
      href: '/admin/traction',
      exact: false,
      icon: TrendingUp,
    },
    {
      name: 'Assets',
      href: '/admin/assets',
      exact: false,
      icon: FolderDown,
    },
    {
      name: 'Team',
      href: '/admin/team',
      exact: false,
      icon: ShieldCheck,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white border-r border-slate-200/80 sticky top-0 h-screen max-h-screen lg:h-[100dvh] p-4 lg:p-5 flex-shrink-0 select-none z-30 overflow-hidden justify-between">
      {/* Brand Logo */}
      <div className="pb-3 lg:pb-4 border-b border-slate-100 flex-shrink-0">
        <Link href="/admin" className="block focus:outline-none">
          <TerraTernLogo size="md" subtitle="Lead Portal" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="my-2 lg:my-3 flex-1 space-y-0.5 lg:space-y-1 overflow-y-auto no-scrollbar min-h-0">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 block mb-1.5 lg:mb-2">
          Management
        </span>
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`group flex items-center gap-3 px-3 py-2 lg:py-2.5 rounded-xl text-xs lg:text-sm font-semibold transition ${
                isActive
                  ? 'bg-blue-50 text-[#00215C] font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-[#00215C] hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0 transition ${
                  isActive ? 'text-[#255CC1]' : 'text-slate-400 group-hover:text-[#255CC1]'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Session & Role Card - Permanently pinned at bottom */}
      <div className="pt-3 lg:pt-4 border-t border-slate-100 mt-auto flex-shrink-0">
        <div className="flex items-center justify-between p-2 lg:p-2.5 rounded-xl bg-slate-50 border border-slate-100">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-xs font-bold text-slate-800 truncate" title={userEmail}>
              {userEmail}
            </span>
            <div className="mt-0.5">
              <RoleBadge role={userRole} />
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            title="Sign Out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
