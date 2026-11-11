'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TerraTernLogo } from '../ui/TerraTernLogo';
import { RoleBadge } from '../ui/Badge';
import { AdminRole } from '@/lib/types';
import { LogOut, User, ChevronDown, KeyRound } from 'lucide-react';
import { ChangePasswordModal } from '@/components/auth/ChangePasswordModal';

interface AdminHeaderProps {
  title?: string;
  userEmail?: string;
  userRole?: AdminRole;
  onSignOut: () => void;
}

export function AdminHeader({
  userEmail = 'abhinay.vadla@terratern.com',
  userRole = 'viewer',
  onSignOut,
}: AdminHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  // Close dropdown when tapping outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 flex items-center justify-between">
      {/* Mobile only: Logo */}
      <div className="flex items-center gap-2">
        <TerraTernLogo size="sm" showBadge={false} />
      </div>

      {/* Top Right: Role Badge & Profile Icon */}
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <RoleBadge role={userRole} />

        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="User profile menu"
            className="flex items-center gap-1 p-0.5 rounded-full hover:bg-slate-100 active:scale-95 transition focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-[#00215C] text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-200 shadow-2xs">
              {initial}
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="p-2.5 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-7 h-7 rounded-full bg-[#00215C] text-white flex items-center justify-center font-bold text-xs">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-slate-900 truncate block" title={userEmail}>
                      {userEmail}
                    </span>
                  </div>
                </div>
                <div className="mt-1">
                  <RoleBadge role={userRole} />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  setPasswordModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition mb-1"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#255CC1]" />
                <span>Change Password</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        userEmail={userEmail}
      />
    </header>
  );
}
