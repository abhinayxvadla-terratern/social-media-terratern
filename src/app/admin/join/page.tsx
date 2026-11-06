'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { TerraTernLogo } from '@/components/ui/TerraTernLogo';
import {
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token')?.trim() || '';
  const initialEmail = searchParams.get('email')?.trim() || '';

  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState(initialEmail);
  const [role, setRole] = useState<string>('editor');
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      setError('No invitation token found in the URL. Please verify your invite link.');
      return;
    }

    async function verifyToken() {
      try {
        setChecking(true);
        const res = await fetch(`/api/v1/admin/team/join?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (res.ok && data.valid) {
          if (data.email) setEmail(data.email);
          if (data.role) setRole(data.role);
          setError(null);
        } else {
          setError(data.error || 'This invitation link is invalid or has expired.');
        }
      } catch {
        setError('Failed to verify invitation link. Please check your network connection.');
      } finally {
        setChecking(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check and re-enter.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/admin/team/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create account.');
      }

      setSuccess(true);

      const targetEmail = data.email || email;

      // Clear any conflicting active session first
      try {
        await supabase.auth.signOut();
      } catch {}

      // Sign in with the newly created account
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (!loginError) {
        setTimeout(() => {
          router.push('/admin/pages');
        }, 1000);
      } else {
        setTimeout(() => {
          router.push(`/admin/login?email=${encodeURIComponent(targetEmail)}`);
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during account creation.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/25 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex flex-col items-center text-center">
          <TerraTernLogo size="lg" variant="stacked" />
          <h2 className="mt-4 text-2xl font-black text-[#00215C] tracking-tight">
            Create Account
          </h2>
        </div>

        {/* Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          {checking ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-[#255CC1] animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading your invitation...</p>
            </div>
          ) : error && !email ? (
            <div className="space-y-4 py-4 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Invitation Link Expired or Invalid</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{error}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/admin/login')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Go to Sign In
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">Account created! Redirecting to your dashboard...</span>
                </div>
              )}

              {/* Email Address (Pre-filled by default from Admin invite) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address
                  </label>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                    Role: {role}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    aria-readonly="true"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 cursor-not-allowed select-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter your password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#255CC1] transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#255CC1] transition-all"
                  />
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || success || !password || !confirmPassword}
                className="w-full mt-2 py-3 px-4 bg-[#00215C] hover:bg-[#255CC1] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#00215C]/20 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>}>
      <JoinTeamContent />
    </Suspense>
  );
}
