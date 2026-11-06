'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Filter,
  Calendar,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

interface TrafficChannelItem {
  channel: string;
  source: string;
  count: number;
  percentage: number;
  color: string;
  dotColor: string;
}

type TimeRange = 'all' | 'today' | '7d' | '30d' | 'this_month' | 'custom';
type LeadTypeFilter = 'all' | 'complete' | 'partial';

function matchesDateRange(
  dateString: string | null | undefined,
  range: TimeRange,
  startDate?: string,
  endDate?: string
): boolean {
  if (range === 'all' || !dateString) return true;
  const itemDate = new Date(dateString);
  if (isNaN(itemDate.getTime())) return true;

  const now = new Date();
  if (range === 'today') {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth() &&
      itemDate.getDate() === now.getDate()
    );
  }
  if (range === '7d') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return itemDate >= sevenDaysAgo;
  }
  if (range === '30d') {
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return itemDate >= thirtyDaysAgo;
  }
  if (range === 'this_month') {
    return (
      itemDate.getFullYear() === now.getFullYear() &&
      itemDate.getMonth() === now.getMonth()
    );
  }
  if (range === 'custom') {
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (!isNaN(start.getTime()) && itemDate < start) return false;
    }
    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999`);
      if (!isNaN(end.getTime()) && itemDate > end) return false;
    }
    return true;
  }
  return true;
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
  if (s.includes('manychat') || s.includes('auto_connector') || s.includes('connector')) {
    return {
      label: 'ManyChat Automation',
      color: 'bg-purple-600',
      dotColor: 'bg-purple-600',
    };
  }
  return {
    label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '),
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

  // Active filter state
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedPageId, setSelectedPageId] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [leadType, setLeadType] = useState<LeadTypeFilter>('all');

  // Raw fetched data
  const [rawPages, setRawPages] = useState<Page[]>(() => cached?.pages || []);
  const [rawLeads, setRawLeads] = useState<Lead[]>(() => cached?.recentLeads || []);
  const [rawEvents, setRawEvents] = useState<{ id: string; page_id: string | null; type: string; created_at: string }[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);

  useEffect(() => {
    async function fetchOverview() {
      try {
        if (!cached) setLoading(true);

        // 1. Fetch Pages
        const { data: pagesData } = await supabase
          .from('pages')
          .select('*')
          .order('created_at', { ascending: false });

        // 2. Fetch All Leads with page info
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*, page:pages(id, name, slug)')
          .order('created_at', { ascending: false });

        // 3. Fetch Raw Events for date & page filtering
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, page_id, type, created_at');

        // 4. Fetch Page Stats view
        const { data: pageStatsData } = await supabase
          .from('page_stats')
          .select('*');

        const allPages = (pagesData as Page[]) || [];
        const allLeads = (leadsData as unknown as Lead[]) || [];
        const allEvents = (eventsData as any[]) || [];
        const allStats = (pageStatsData as PageStat[]) || [];

        setRawPages(allPages);
        setRawLeads(allLeads);
        setRawEvents(allEvents);
        setPageStats(allStats);

        setCachedData('admin_overview', {
          pages: allPages,
          recentLeads: allLeads.slice(0, 6),
          stats: {
            totalLeads: allLeads.length,
            totalPagesCount: allPages.length,
          },
        });
      } catch (err) {
        console.error('Failed to load overview analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchOverview();
  }, []);

  const isFiltered =
    timeRange !== 'all' ||
    selectedPageId !== 'all' ||
    selectedSource !== 'all' ||
    leadType !== 'all' ||
    Boolean(startDate) ||
    Boolean(endDate);

  const handleResetFilters = () => {
    setTimeRange('all');
    setStartDate('');
    setEndDate('');
    setSelectedPageId('all');
    setSelectedSource('all');
    setLeadType('all');
  };

  // 1. Pages that are active (status === 'live')
  const activePages = useMemo(() => {
    return rawPages.filter((p) => p.status === 'live');
  }, [rawPages]);

  const activePageIds = useMemo(() => {
    return new Set(activePages.map((p) => p.id));
  }, [activePages]);

  // 2. Traffic sources ONLY from active pages
  const activeSources = useMemo(() => {
    const sourcesSet = new Set<string>();

    const matchesPage = (pageId: string | null | undefined) => {
      if (!pageId) return false;
      if (selectedPageId !== 'all') {
        return pageId === selectedPageId;
      }
      return activePageIds.has(pageId);
    };

    // Sources from leads on active pages
    rawLeads.forEach((lead) => {
      if (matchesPage(lead.page_id)) {
        const info = getChannelInfo(lead.source);
        if (info.label) sourcesSet.add(info.label);
      }
    });

    // Sources from events on active pages
    rawEvents.forEach((ev) => {
      if (matchesPage(ev.page_id)) {
        const rawSource = (ev as any).meta?.source;
        const info = getChannelInfo(rawSource || 'direct');
        if (info.label) sourcesSet.add(info.label);
      }
    });

    return Array.from(sourcesSet).sort();
  }, [rawLeads, rawEvents, activePageIds, selectedPageId]);

  // Compute filtered metrics dynamically
  const computedData = useMemo(() => {
    // 1. Filter Leads
    const filteredLeads = rawLeads.filter((lead) => {
      // Date filter
      if (!matchesDateRange(lead.created_at, timeRange, startDate, endDate)) return false;

      // Page filter (only active pages unless specific page selected)
      if (selectedPageId !== 'all') {
        if (lead.page_id !== selectedPageId) return false;
      }

      // Source filter
      if (selectedSource !== 'all') {
        const info = getChannelInfo(lead.source);
        if (info.label !== selectedSource) return false;
      }

      // Lead type filter
      if (leadType === 'complete' && lead.is_partial) return false;
      if (leadType === 'partial' && !lead.is_partial) return false;

      return true;
    });

    // 2. Filter Events
    const filteredEvents = rawEvents.filter((event) => {
      // Date filter
      if (!matchesDateRange(event.created_at, timeRange, startDate, endDate)) return false;

      // Page filter
      if (selectedPageId !== 'all') {
        if (event.page_id !== selectedPageId) return false;
      }

      return true;
    });

    // 3. Aggregate Leads metrics
    const totalLeads = filteredLeads.length;
    const completeLeads = filteredLeads.filter((l) => !l.is_partial).length;
    const partialLeads = filteredLeads.filter((l) => l.is_partial).length;

    // 4. Aggregate Event metrics
    let viewsFromEvents = 0;
    let startsFromEvents = 0;
    let downloadsFromEvents = 0;

    filteredEvents.forEach((ev) => {
      if (ev.type === 'view') viewsFromEvents++;
      else if (ev.type === 'start') startsFromEvents++;
      else if (ev.type === 'download') downloadsFromEvents++;
    });

    // Baseline stats from pageStats view (when no date filter is active)
    let viewsFromStats = 0;
    let startsFromStats = 0;
    let downloadsFromStats = 0;

    pageStats.forEach((s) => {
      if (selectedPageId !== 'all' && s.page_id !== selectedPageId) {
        return;
      }
      viewsFromStats += s.views || 0;
      startsFromStats += s.starts || 0;
      downloadsFromStats += s.downloads || 0;
    });

    const isDateRestricted = timeRange !== 'all' && (timeRange !== 'custom' || Boolean(startDate || endDate));

    const totalViews =
      !isDateRestricted
        ? Math.max(viewsFromStats, viewsFromEvents, totalLeads)
        : Math.max(viewsFromEvents, totalLeads);

    const totalStarts =
      !isDateRestricted
        ? Math.max(startsFromStats, startsFromEvents, totalLeads)
        : Math.max(startsFromEvents, totalLeads);

    const totalDownloads =
      !isDateRestricted
        ? Math.max(downloadsFromStats, downloadsFromEvents)
        : downloadsFromEvents;

    const conversionRate =
      totalViews > 0
        ? (totalLeads / totalViews) * 100
        : totalLeads > 0
        ? 100
        : 0;

    // 5. Pages status
    const relevantPages = selectedPageId !== 'all'
      ? rawPages.filter((p) => p.id === selectedPageId)
      : activePages;
    const activePagesCount = relevantPages.filter((p) => p.status === 'live').length;
    const totalPagesCount = relevantPages.length;

    // 6. Traffic Channels Breakdown (strictly from active pages)
    const channelCounts: Record<string, number> = {};
    filteredLeads.forEach((lead) => {
      if (lead.page_id && activePageIds.has(lead.page_id)) {
        const info = getChannelInfo(lead.source);
        channelCounts[info.label] = (channelCounts[info.label] || 0) + 1;
      }
    });

    // If no leads yet, attribute from events on active pages
    if (Object.keys(channelCounts).length === 0) {
      filteredEvents.forEach((ev) => {
        if (ev.page_id && activePageIds.has(ev.page_id)) {
          const raw = (ev as any).meta?.source;
          const info = getChannelInfo(raw || (ev.type === 'view' ? 'direct' : ''));
          channelCounts[info.label] = (channelCounts[info.label] || 0) + 1;
        }
      });
    }

    if (Object.keys(channelCounts).length === 0 && totalLeads > 0) {
      channelCounts['Direct / Organic'] = totalLeads;
    }

    const totalChanneled =
      Object.values(channelCounts).reduce((a, b) => a + b, 0) || totalLeads || 1;

    const trafficChannelsList: TrafficChannelItem[] = Object.entries(channelCounts)
      .map(([channelLabel, count]) => {
        const info = getChannelInfo(channelLabel);
        return {
          channel: channelLabel,
          source: channelLabel,
          count,
          percentage: Math.round((count / totalChanneled) * 100),
          color: info.color,
          dotColor: info.dotColor,
        };
      })
      .sort((a, b) => b.count - a.count);

    // 7. Pages ranking with filtered stats
    const pageLeadCounts = new Map<string, number>();
    filteredLeads.forEach((lead) => {
      if (lead.page_id) {
        pageLeadCounts.set(lead.page_id, (pageLeadCounts.get(lead.page_id) || 0) + 1);
      }
    });

    const rankedPages = rawPages
      .map((p) => {
        const directCount = pageLeadCounts.get(p.id) || 0;
        const stat = pageStats.find((s) => s.page_id === p.id);
        const leadsCount = isFiltered ? directCount : Math.max(stat?.leads ?? 0, directCount);
        return {
          ...p,
          leads_count: leadsCount,
          conversion_percentage: stat?.conversion_percentage ?? (leadsCount > 0 ? 100 : 0),
        };
      })
      .filter((p) => {
        if (selectedPageId !== 'all') return p.id === selectedPageId;
        return p.status === 'live';
      })
      .sort((a, b) => (b.leads_count || 0) - (a.leads_count || 0));

    return {
      totalLeads,
      completeLeads,
      partialLeads,
      totalViews,
      totalStarts,
      totalDownloads,
      conversionRate,
      activePagesCount,
      totalPagesCount,
      trafficChannels: trafficChannelsList,
      recentLeads: filteredLeads.slice(0, 6),
      pages: rankedPages,
    };
  }, [
    rawLeads,
    rawEvents,
    rawPages,
    pageStats,
    timeRange,
    startDate,
    endDate,
    selectedPageId,
    selectedSource,
    leadType,
    isFiltered,
    activePageIds,
    activePages,
  ]);

  // Display count for the Total Leads card based on leadType selection
  const displayLeadsCount =
    leadType === 'complete'
      ? computedData.completeLeads
      : leadType === 'partial'
      ? computedData.partialLeads
      : computedData.totalLeads;

  // Selected single page if user chose one
  const selectedPage =
    selectedPageId !== 'all'
      ? rawPages.find((p) => p.id === selectedPageId)
      : null;

  // Time range friendly label
  const timeRangeLabel =
    timeRange === 'today'
      ? 'Today'
      : timeRange === '7d'
      ? 'Last 7 Days'
      : timeRange === '30d'
      ? 'Last 30 Days'
      : timeRange === 'this_month'
      ? 'This Month'
      : timeRange === 'custom'
      ? startDate && endDate
        ? `${startDate} to ${endDate}`
        : startDate
        ? `From ${startDate}`
        : endDate
        ? `Until ${endDate}`
        : 'Custom Range'
      : 'All Time';

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

      {/* 1b. Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#255CC1]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Filters
            </h2>
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-[#255CC1] hover:underline flex items-center gap-1 active:scale-95 transition"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* 4 Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {/* Campaign Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Campaign
            </label>
            <div className="relative">
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#255CC1] cursor-pointer appearance-none transition"
              >
                <option value="all">All Pages ({activePages.length})</option>
                {activePages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {cleanPageName(p.name)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Source Filter (Only Active Pages) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Source
            </label>
            <div className="relative">
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#255CC1] cursor-pointer appearance-none transition"
              >
                <option value="all">All Sources ({activeSources.length})</option>
                {activeSources.map((src) => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Date Range
            </label>
            <div className="relative">
              <select
                value={timeRange}
                onChange={(e) => {
                  const val = e.target.value as TimeRange;
                  setTimeRange(val);
                  if (val !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#255CC1] cursor-pointer appearance-none transition"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Range (From / To)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-2.5" />
            </div>

            {timeRange === 'custom' && (
              <div className="pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-10 shrink-0">
                    From
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#255CC1] transition"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 w-10 shrink-0">
                    To
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#255CC1] transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lead Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Lead Status
            </label>
            <div className="relative">
              <select
                value={leadType}
                onChange={(e) => setLeadType(e.target.value as any)}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-[#255CC1] cursor-pointer appearance-none transition"
              >
                <option value="all">All Leads</option>
                <option value="complete">Complete</option>
                <option value="partial">Partial</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Executive KPI Cards (4 Metric Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Leads */}
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
            {loading ? '—' : formatNumber(displayLeadsCount)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {computedData.completeLeads} complete &bull; {computedData.partialLeads} partial
          </p>
        </div>

        {/* Card 2: Conversion Rate */}
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
            {loading ? '—' : formatPercentage(computedData.conversionRate)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Visitors converted into applicants
          </p>
        </div>

        {/* Card 3: Total Traffic */}
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
            {loading ? '—' : formatNumber(computedData.totalViews)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            {computedData.totalStarts} assessments started
          </p>
        </div>

        {/* Card 4: Active Campaigns */}
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
            {loading ? '—' : activePages.length}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Out of {rawPages.length} total pages
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
            const totalViews = computedData.totalViews;
            const totalEngaged = Math.max(computedData.totalStarts, computedData.totalLeads);
            const totalLeads = computedData.totalLeads;

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

            {computedData.trafficChannels.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No campaign traffic recorded matching current filters.
              </div>
            ) : (
              <div className="space-y-3 pt-3">
                {computedData.trafficChannels.map((item, idx) => (
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
              {computedData.totalLeads} {computedData.totalLeads === 1 ? 'lead' : 'leads'}
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

          {computedData.pages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No pages match the selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {computedData.pages.slice(0, 5).map((page) => {
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

          {computedData.recentLeads.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No applicant inquiries found for the selected filters.
            </div>
          ) : (
            <div className="space-y-2.5">
              {computedData.recentLeads.map((lead) => (
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
