import React from "react";
import { AdminRole, PageStatus, PageType } from "@/lib/types";

interface RoleBadgeProps {
  role: AdminRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const styles: Record<AdminRole, string> = {
    owner: "bg-purple-50 text-purple-700 border-purple-200/80 ring-purple-500/20",
    editor: "bg-blue-50 text-blue-700 border-blue-200/80 ring-blue-500/20",
    viewer: "bg-slate-100 text-slate-700 border-slate-200 ring-slate-500/20",
  };

  const labels: Record<AdminRole, string> = {
    owner: "Owner",
    editor: "Editor",
    viewer: "Viewer (Read Only)",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[role]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {labels[role]}
    </span>
  );
}

interface StatusBadgeProps {
  status: PageStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<
    PageStatus,
    { bg: string; dot: string; label: string; animateDot?: boolean }
  > = {
    live: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dot: "bg-emerald-500",
      label: "Live",
      animateDot: true,
    },
    draft: {
      bg: "bg-amber-50 text-amber-700 border-amber-200/80",
      dot: "bg-amber-500",
      label: "Draft",
    },
    paused: {
      bg: "bg-rose-50 text-rose-700 border-rose-200/80",
      dot: "bg-rose-500",
      label: "Paused",
    },
    scheduled: {
      bg: "bg-sky-50 text-sky-700 border-sky-200/80",
      dot: "bg-sky-500",
      label: "Scheduled",
    },
  };

  const { bg, dot, label, animateDot } = config[status] || config.draft;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}
    >
      <span className="relative flex h-2 w-2">
        {animateDot && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${dot}`} />
      </span>
      {label}
    </span>
  );
}

interface PageTypeBadgeProps {
  type: PageType;
}

export function PageTypeBadge({ type }: PageTypeBadgeProps) {
  const labels: Record<PageType, { label: string; icon: string }> = {
    quiz: { label: "Interactive Quiz", icon: "⚡" },
    lead_pdf: { label: "PDF Download", icon: "📄" },
    welcome: { label: "Welcome Page", icon: "👋" },
    other: { label: "Landing Page", icon: "🌐" },
  };

  const item = labels[type] || labels.other;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
      <span>{item.icon}</span>
      <span>{item.label}</span>
    </span>
  );
}
