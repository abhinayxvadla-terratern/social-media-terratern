'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Page, Lead, PageStat, DailyTrend } from '@/lib/types';
import { useAdmin } from '@/contexts/AdminContext';
import { formatNumber, formatPercentage, formatDate } from '@/lib/utils';
import { cleanPageName } from '@/lib/vibe-engine';
import { getCachedData, setCachedData } from '@/lib/client-cache';
import {
  Users,
  Eye,
  TrendingUp,
  FileText,
  Sparkles,
  Globe,
  ArrowRight,
  RefreshCw,
  Award,
  Phone,
  MessageCircle,
  ExternalLink,
  Share2,
  CheckCircle2,
  Clock,
  Layers,
  BarChart3,
  Flame,
  Download,
  MousePointerClick,
  UserCheck,
} from 'lucide-react';

interface TrafficChannelItem {
  channel: string;
  source: string;
  count: number;
  percentage: number;
  color: string;
  dotColor: string;
}

function getChannelInfo(source: string | null | undefined): { label: string; color: string; dotColor: string } {
  const s = (source || '').toLowerCase().trim();
  if (!s || s === 'direct' || s === 'direct / organic' || s === 'none' || s === 'null') {
    return {
      label: 'Direct / Organic',
      color: 'bg-slate-700',
      dotColor: 'bg-slate-500',
    };
  }
  if (s.includes('ig') || s.includes('instagram')) {
    if (s.includes('dm')) {
      return {
        label: 'Instagram DM',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        dotColor: 'bg-pink-500',
      };
    }
    if (s.includes('bio')) {
      return {
        label: 'Instagram Bio',
        color: 'bg-pink-500',
        dotColor: 'bg-pink-500',
      };
    }
    return {
      label: 'Instagram',
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      dotColor: 'bg-pink-500',
    };
  }
  if (s.includes('wa') || s.includes('whatsapp')) {
    return {
      label: 'WhatsApp Direct',
      color: 'bg-emerald-500',
      dotColor: 'bg-emerald-500',
    };
  }
  if (s.includes('fb') || s.includes('facebook')) {
    return {
      label: 'Facebook Ads',
      color: 'bg-blue-600',
      dotColor: 'bg-blue-600',
    };
  }
  if (s.includes('linkedin')) {
    return {
      label: 'LinkedIn',
      color: 'bg-sky-600',
      dotColor: 'bg-sky-600',
    };
  }
  if (s.includes('youtube') || s.includes('yt')) {
    return {
      label: 'YouTube',
      color: 'bg-red-600',
      dotColor: 'bg-red-600',
    };
  }
  if (s.includes('google')) {
    return {
      label: 'Google Search / Ads',
      color: 'bg-amber-500',
      dotColor: 'bg-amber-500',
    };
  }
  if (s.includes('email') || s.includes('newsletter')) {
    return {
      label: 'Email Campaign',
      color: 'bg-indigo-600',
      dotColor: 'bg-indigo-600',
    };
  }
  if (s.includes('manychat')) {
    return {
      label: 'ManyChat Automation',
      color: 'bg-purple-600',
      dotColor: 'bg-purple-600',
    };
  }
  return {
    label: s.charAt(0).toUpperCase() + s.slice(1),
    color: 'bg-blue-500',
    dotColor: 'bg-blue-500',
  };
}

export default function AdminOverviewDashboard() {
  const { canEdit, userRole } = useAdmin();
  const supabase = createClient();

  const cached = getCachedData<{
    pages: Page[];
    recentLeads: Lead[];
    stats: any;
    trafficChannels?: TrafficChannelItem[];
  }>('admin_overview');

  const [loading, setLoading] = useState(() => !cached);
  const [pages, setPages] = useState<Page[]>(() => cached?.pages || []);
  const [recentLeads, setRecentLeads] = useState<Lead[]>(() => cached?.recentLeads || []);
  const [trafficChannels, setTrafficChannels] = useState<TrafficChannelItem[]>(() => cached?.trafficChannels || []);
  const [stats, setStats] = useState<{
    totalLeads: number;
    completeLeads: number;
    partialLeads: number;
    totalViews: number;
    totalStarts: number;
    totalDownloads: number;
    conversionRate: number;
    activePagesCount: number;
    totalPagesCount: number;
  }>(() => cached?.stats || {
    totalLeads: 0,
    completeLeads: 0,
    partialLeads: 0,
    totalViews: 0,
    totalStarts: 0,
    totalDownloads: 0,
    conversionRate: 0,
    activePagesCount: 0,
    totalPagesCount: 0,
  });

  useEffect(() => {
    async function fetchOverview() {
      try {
        if (!cached) setLoading(true);

        // 1. Fetch Pages
        const { data: pagesData } = await supabase
          .from('pages')
          .select('*')
          .order('created_at', { ascending: false });

        // 2. Fetch Recent Leads
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*, page:pages(id, name, slug)')
          .order('created_at', { ascending: false })
          .limit(6);

        // 2b. Fetch all leads summary directly for 100% count accuracy
        const { data: allLeadsRaw } = await supabase
          .from('leads')
          .select('id, page_id, is_partial');

        // 3. Fetch Page Stats view
        const { data: pageStatsData } = await supabase
          .from('page_stats')
          .select('*');

        // 4. Fetch Traffic Channels from leads_by_source
        const { data: sourceData } = await supabase
          .from('leads_by_source')
          .select('*');

        const allPages = (pagesData as Page[]) || [];
        const allLeads = (leadsData as Lead[]) || [];
        const allStats = (pageStatsData as PageStat[]) || [];

        // Count leads directly from leads table
        const directPageLeadCounts = new Map<string, number>();
        let directTotalLeads = 0;
        let directCompleteLeads = 0;
        let directPartialLeads = 0;

        (allLeadsRaw || []).forEach((lead: any) => {
          directTotalLeads++;
          if (lead.is_partial) directPartialLeads++;
          else directCompleteLeads++;
          if (lead.page_id) {
            directPageLeadCounts.set(lead.page_id, (directPageLeadCounts.get(lead.page_id) || 0) + 1);
          }
        });

        // Build stats lookup map
        const statsMap = new Map<string, { leads: number; conversion: number }>();
        allStats.forEach((s: any) => {
          statsMap.set(s.page_id, {
            leads: Number(s.leads || 0),
            conversion: Number(s.conversion_percentage || 0),
          });
        });

        // Merge stats with pages so leads_count and conversion_percentage are properly populated
        const mergedPages = allPages
          .map((p: any) => {
            const stat = statsMap.get(p.id);
            const directCount = directPageLeadCounts.get(p.id) || 0;
            const finalLeads = Math.max(stat?.leads ?? 0, directCount);
            return {
              ...p,
              leads_count: finalLeads,
              conversion_percentage: stat?.conversion ?? (finalLeads > 0 ? 100 : 0),
            };
          })
          .sort((a, b) => (b.leads_count || 0) - (a.leads_count || 0));

        setPages(mergedPages);
        setRecentLeads(allLeads);

        // Aggregate Metrics
        let views = 0;
        let starts = 0;
        let downloads = 0;
        let totalL = 0;
        let completeL = 0;
        let partialL = 0;

        allStats.forEach((s) => {
          views += s.views || 0;
          starts += s.starts || 0;
          downloads += s.downloads || 0;
          totalL += s.leads || 0;
          completeL += s.complete_leads || 0;
          partialL += s.partial_leads || 0;
        });

        const activePages = allPages.filter((p) => p.status === 'live').length;
        const finalTotalLeads = Math.max(totalL, directTotalLeads);
        const finalCompleteLeads = Math.max(completeL, directCompleteLeads);
        const finalPartialLeads = Math.max(partialL, directPartialLeads);
        const conv = views > 0 ? (finalTotalLeads / views) * 100 : (finalTotalLeads > 0 ? 100 : 0);

        const newStats = {
          totalLeads: finalTotalLeads,
          completeLeads: finalCompleteLeads,
          partialLeads: finalPartialLeads,
          totalViews: Math.max(views, finalTotalLeads),
          totalStarts: Math.max(starts, finalTotalLeads),
          totalDownloads: downloads,
          conversionRate: conv,
          activePagesCount: activePages,
          totalPagesCount: allPages.length,
        };

        setStats(newStats);

        // Aggregate Traffic Channels from real database records
        const channelCounts: Record<string, number> = {};
        (sourceData || []).forEach((row: any) => {
          const raw = (row.source || 'direct / organic').toLowerCase().trim();
          channelCounts[raw] = (channelCounts[raw] || 0) + (row.total_leads || 0);
        });

        if (Object.keys(channelCounts).length === 0 && totalL > 0) {
          channelCounts['direct / organic'] = totalL;
        }

        const totalChanneled = Object.values(channelCounts).reduce((a, b) => a + b, 0) || totalL || 1;

        const channels: TrafficChannelItem[] = Object.entries(channelCounts)
          .map(([src, count]) => {
            const info = getChannelInfo(src);
            return {
              channel: info.label,
              source: src,
              count,
              percentage: Math.round((count / totalChanneled) * 100),
              color: info.color,
              dotColor: info.dotColor,
            };
          })
          .sort((a, b) => b.count - a.count);

        setTrafficChannels(channels);

        setCachedData('admin_overview', {
          pages: mergedPages,
          recentLeads: allLeads,
          stats: newStats,
          trafficChannels: channels,
        });
      } catch (err) {
        console.error('Failed to load overview analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-full inline-block mb-1.5">
            Overview
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#00215C] tracking-tight">
            Performance Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Campaign conversion rates, visitor traffic, and applicant inquiries.
          </p>
        </div>

        {/* Action Button: Build Page */}
        {canEdit && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/admin/pages/build"
              className="px-4 py-2.5 bg-[#00215C] hover:bg-[#255CC1] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#F1C819]" />
              <span>Build Page</span>
            </Link>
          </div>
        )}
      </div>

      {/* 2. Top Executive KPI Cards (4 Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Leads */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Leads
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#255CC1] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#00215C]">
            {loading ? '—' : formatNumber(stats.totalLeads)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {stats.completeLeads} complete &bull; {stats.partialLeads} partial
          </p>
        </div>

        {/* Overall Conversion % */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Conversion Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {loading ? '—' : formatPercentage(stats.conversionRate)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Visitors converted into applicants
          </p>
        </div>

        {/* Traffic & Views */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Traffic
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#00215C]">
            {loading ? '—' : formatNumber(stats.totalViews)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {stats.totalStarts} assessments started
          </p>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Campaigns
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-[#00215C]">
            {loading ? '—' : stats.activePagesCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Out of {stats.totalPagesCount} total pages
          </p>
        </div>
      </div>

      {/* 3. Middle Grid: Funnel & Inbound Traffic Routing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: User Conversion Funnel (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lead Generation Funnel</h2>
              <p className="text-xs text-slate-500">Step-by-step visitor progression from view to qualification.</p>
            </div>
            <Link
              href="/admin/traction"
              className="text-xs font-bold text-[#255CC1] hover:underline flex items-center gap-1"
            >
              <span>Detailed Dropoffs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Funnel Pipeline Steps */}
          {(() => {
            const totalViews = stats.totalViews;
            const totalEngaged = Math.max(stats.totalStarts, stats.totalLeads);
            const totalLeads = stats.totalLeads;

            const engagementRate = totalViews > 0
              ? Math.min(100, Math.round((totalEngaged / totalViews) * 100))
              : (totalEngaged > 0 ? 100 : 0);

            const leadConvRate = totalViews > 0
              ? Math.min(100, Math.round((totalLeads / totalViews) * 100))
              : (totalLeads > 0 ? 100 : 0);

            return (
              <div className="space-y-4 pt-2">
                {/* Stage 1: Page Views */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">1. Total Page Views</span>
                    <span className="font-bold text-[#00215C] font-mono">{formatNumber(totalViews)} (100%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#00215C] h-full rounded-full transition-all duration-500"
                      style={{ width: totalViews > 0 ? '100%' : '0%' }}
                    />
                  </div>
                </div>

                {/* Stage 2: Engaged Visitors */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">2. Engaged Visitors</span>
                    <span className="font-bold text-[#255CC1] font-mono">
                      {formatNumber(totalEngaged)} ({engagementRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#255CC1] h-full rounded-full transition-all duration-500"
                      style={{ width: `${engagementRate}%` }}
                    />
                  </div>
                </div>

                {/* Stage 3: Verified Leads Captured */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-700">3. Verified Leads Captured</span>
                    <span className="font-bold text-emerald-600 font-mono">
                      {formatNumber(totalLeads)} ({leadConvRate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${leadConvRate}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right: Real Inbound Traffic Channels */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-base font-bold text-slate-900">Traffic Channels</h2>
                <p className="text-xs text-slate-500">Inbound source breakdown.</p>
              </div>
              <Link
                href="/admin/leads"
                className="text-xs font-bold text-[#255CC1] hover:underline"
              >
                View Leads &rarr;
              </Link>
            </div>

            {trafficChannels.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No campaign traffic recorded yet.
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {trafficChannels.map((item, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.dotColor}`}></span>
                        <span className="font-bold text-slate-800">{item.channel}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-extrabold text-[#00215C]">
                          {item.count} {item.count === 1 ? 'lead' : 'leads'}
                        </span>
                        <span className="text-slate-400 font-semibold">({item.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                        style={{ width: `${Math.max(6, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Attributed Leads</span>
            <span className="font-bold text-slate-900 font-mono">
              {stats.totalLeads} {stats.totalLeads === 1 ? 'lead' : 'leads'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Top Pages Leaderboard & Live Leads Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Performing Landing Pages */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Campaign Pages</h2>
              <p className="text-xs text-slate-500">Highest performing landing pages.</p>
            </div>
            <Link
              href="/admin/pages"
              className="text-xs font-bold text-[#255CC1] hover:underline flex items-center gap-1"
            >
              <span>Manage Pages</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No pages published yet. Click "Build Page" to launch your first assessment.
            </div>
          ) : (
            <div className="space-y-2">
              {pages.slice(0, 5).map((page) => {
                const displayName = cleanPageName(page.name);
                return (
                  <div
                    key={page.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs hover:bg-slate-100/70 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          page.status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                        title={`Status: ${page.status}`}
                      ></span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate" title={displayName}>
                          {displayName}
                        </h4>
                        <p className="text-[11px] text-slate-400 font-mono truncate">/p/{page.slug}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className="font-extrabold text-[#255CC1] font-mono bg-blue-50 border border-blue-200/70 px-2.5 py-0.5 rounded-lg text-xs">
                        {formatNumber(page.leads_count || 0)} {page.leads_count === 1 ? 'lead' : 'leads'}
                      </span>
                      <a
                        href={`/p/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 text-slate-400 hover:text-slate-800 transition"
                        title="Open live page in new tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Inbound Leads Live Feed */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Applicant Inquiries</h2>
              <p className="text-xs text-slate-500">Live stream of captured social leads.</p>
            </div>
            <Link
              href="/admin/leads"
              className="text-xs font-bold text-[#255CC1] hover:underline flex items-center gap-1"
            >
              <span>View All Leads</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No leads captured yet. Publish a page and share your ManyChat link to start collecting inquiries.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 flex items-center justify-between gap-3 text-xs transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#00215C] font-black text-xs flex items-center justify-center flex-shrink-0">
                      {lead.name ? lead.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 truncate">{lead.name || 'Visitor'}</span>
                        {lead.keyword && (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-[#255CC1] border border-blue-200 rounded text-[9px] font-bold uppercase">
                            {lead.keyword}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{lead.phone_e164 || lead.email}</p>
                    </div>
                  </div>

                  {/* 1-Click WhatsApp & Call Quick Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lead.quiz_score !== null && (
                      <span className="font-black text-[#255CC1] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 text-[10px]">
                        {lead.quiz_score} pts
                      </span>
                    )}

                    {lead.phone_e164 && (
                      <a
                        href={`https://wa.me/${lead.phone_e164.replace('+', '')}?text=Hi%20${encodeURIComponent(
                          lead.name || ''
                        )},%20thank%20you%20for%20reaching%20out%20to%20TerraTern.`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        title="1-Click WhatsApp Direct Chat"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
