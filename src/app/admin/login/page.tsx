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
  HelpCircle,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
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
  const [showSetupGuide, setShowSetupGuide] = useState(false);

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
          "Access Denied: Your account is authenticated, but not registered in the admin_users roster. Please contact the administrator."
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
            Admin Authentication
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm">
            Sign in to manage lead generation pages, track submissions, and view conversion analytics.
          </p>
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
                Admin Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="abhinay.vadla@terratern.com"
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

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full mt-2 py-3 px-4 bg-[#00215C] hover:bg-[#255CC1] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#00215C]/20 flex items-center justify-center gap-2 touch-target"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* First-time setup helper */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSetupGuide(!showSetupGuide)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-blue-700 transition-colors font-medium py-1"
            >
              <span className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                <span>First time setting up the owner user?</span>
              </span>
              {showSetupGuide ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showSetupGuide && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-2 animate-in fade-in">
                <p className="font-semibold text-slate-800 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>How to create your first Owner user:</span>
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                  <li>
                    Create a user in Supabase Dashboard (<strong>Authentication</strong> &rarr; <strong>Add user</strong>).
                  </li>
                  <li>Copy the user's generated UUID.</li>
                  <li>
                    Run this SQL snippet in the Supabase <strong>SQL Editor</strong>:
                  </li>
                </ol>
                <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] overflow-x-auto select-all">
{`insert into public.admin_users (user_id, role)
values ('<your-user-uuid>', 'owner')
on conflict (user_id) do update set role = 'owner';`}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400">
          TerraTern Lead Page Engine &bull; Protected by Row Level Security
        </p>
      </div>
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
