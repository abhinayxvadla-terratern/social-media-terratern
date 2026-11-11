"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TerraTernLogo } from "@/components/ui/TerraTernLogo";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  X,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin/pages";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Supabase Auth Sign In
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Invalid email or password.");
      }

      // 2. Check admin_users authorization
      const { data: adminRecord, error: adminError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (adminError || !adminRecord) {
        // Not in admin_users! Sign out immediately
        await supabase.auth.signOut();
        throw new Error(
          "Access Denied: Your account is not registered as an authorized administrator. Please contact your team owner."
        );
      }

      // 3. Authorized! Redirect to admin dashboard
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/20 to-slate-100 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <TerraTernLogo size="lg" variant="stacked" />
          <h2 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">
            Sign In
          </h2>
        </div>

        {/* Card */}
        <div className="mt-8 bg-white py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200/80">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@terratern.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-semibold text-[#255CC1] hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 py-3 px-4 bg-[#00215C] hover:bg-[#255CC1] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#00215C]/20 flex items-center justify-center gap-2 touch-target"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-[#00215C] flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-[#255CC1]" />
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Forgot your password?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                For security, account credentials are managed directly by your organization's administrator.
              </p>
              <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                <span className="font-semibold text-slate-800 block">How to reset:</span>
                <p className="text-slate-600 leading-relaxed">
                  Please reach out to your team owner (<strong className="text-slate-900">abhinay.vadla@terratern.com</strong>) to receive a secure, one-time account setup link.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
