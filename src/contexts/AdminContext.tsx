'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AdminRole } from '@/lib/types';
import { TerraTernLogo } from '@/components/ui/TerraTernLogo';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export interface AdminContextType {
  user: any;
  userRole: AdminRole;
  role: AdminRole; // convenience alias
  isOwner: boolean;
  canEdit: boolean; // owner or editor
  isViewer: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  isKillSwitchActive: boolean;
  setKillSwitchState: (val: boolean) => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

export const AdminContext = createContext<AdminContextType>({
  user: null,
  userRole: 'viewer',
  role: 'viewer',
  isOwner: false,
  canEdit: false,
  isViewer: true,
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
  isKillSwitchActive: false,
  setKillSwitchState: async () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
  toggleSidebar: () => {},
});

export const useAdmin = () => useContext(AdminContext);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<AdminRole>('viewer');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isKillSwitchActive, setIsKillSwitchActive] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = () => setSidebarCollapsed((prev) => !prev);

  const isLoginPage = pathname === '/admin/login';
  const initialLoadedRef = React.useRef(false);

  const fetchAdminData = async (isInitial = false) => {
    try {
      if (isInitial && !initialLoadedRef.current) {
        setLoading(true);
      }
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setUser(null);
        setIsAuthorized(false);
        if (!isLoginPage) {
          router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      setUser(currentUser);

      // Verify user against admin_users table
      const { data: adminRecord, error: adminError } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (adminError || !adminRecord) {
        setIsAuthorized(false);
        setUserRole('viewer');
      } else {
        setIsAuthorized(true);
        setUserRole(adminRecord.role as AdminRole);
      }

      // Fetch master_kill_switch setting
      const { data: settingRecord } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'master_kill_switch')
        .maybeSingle();

      if (settingRecord && settingRecord.value !== undefined) {
        const val = settingRecord.value;
        const isActive =
          val === true ||
          val?.master_kill_switch === true ||
          val === 'true';
        setIsKillSwitchActive(isActive);
      }
    } catch {
      setIsAuthorized(false);
    } finally {
      setLoading(false);
      initialLoadedRef.current = true;
    }
  };

  useEffect(() => {
    fetchAdminData(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAuthorized(false);
        if (!isLoginPage) router.push('/admin/login');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          setUser(session.user);
          fetchAdminData(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthorized(false);
    router.push('/admin/login');
  };

  const setKillSwitchState = async (newState: boolean) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'master_kill_switch',
        value: newState,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
    setIsKillSwitchActive(newState);
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Full page loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <TerraTernLogo size="lg" />
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-[#255CC1]" />
            <span>Verifying administrative permissions...</span>
          </div>
        </div>
      </div>
    );
  }

  // Unauthorized screen
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your account (<strong className="text-slate-900">{user?.email}</strong>) is not registered as an authorized administrator.
          </p>
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={signOut}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 touch-target"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const contextValue: AdminContextType = {
    user,
    userRole,
    role: userRole,
    isOwner: userRole === 'owner',
    canEdit: userRole === 'owner' || userRole === 'editor',
    isViewer: userRole === 'viewer',
    loading,
    signOut,
    refreshAuth: fetchAdminData,
    isKillSwitchActive,
    setKillSwitchState,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar,
  };

  return <AdminContext.Provider value={contextValue}>{children}</AdminContext.Provider>;
}
