'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Users, TrendingUp, ShieldCheck } from 'lucide-react';

export function AdminBottomNav() {
  const pathname = usePathname();

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
      name: 'Team',
      href: '/admin/team',
      exact: false,
      icon: ShieldCheck,
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-1 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="grid grid-cols-5 items-center">
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
              className={`flex flex-col items-center justify-center min-h-[48px] py-1 px-1 rounded-xl transition-all touch-target ${
                isActive
                  ? 'text-[#255CC1] font-bold'
                  : 'text-slate-500 hover:text-slate-900 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-[#255CC1] stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-[#255CC1] rounded-full animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
