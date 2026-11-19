"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageStat,
  DailyTrend,
  LeadsBySource,
  Page,
} from "@/lib/types";
import { useAdmin } from "@/contexts/AdminContext";
import {
  formatDateOnly,
  formatNumber,
  formatPercentage,
} from "@/lib/utils";
import {
  TrendingUp,
  Calendar,
  Filter,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Layers,
  ArrowDown,
  Globe,
  Tag,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";

export default function TractionAnalyticsPage() {
  const { userRole } = useAdmin();
  const supabase = createClient();

  const cachedTraction = getCachedData<{
    pageStats: PageStat[];
    dailyTrends: DailyTrend[];
    leadsBySource: LeadsBySource[];
    pages: Page[];
  }>("admin_traction");

  const [pageStats, setPageStats] = useState<PageStat[]>(() => cachedTraction?.pageStats || []);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>(() => cachedTraction?.dailyTrends || []);
  const [leadsBySource, setLeadsBySource] = useState<LeadsBySource[]>(() => cachedTraction?.leadsBySource || []);
  const [pages, setPages] = useState<Page[]>(() => cachedTraction?.pages || []);

  const [loading, setLoading] = useState(() => !cachedTraction);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "custom">("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedPageId, setSelectedPageId] = useState<string>("all");

  const fetchTractionData = async () => {
    try {
      if (!cachedTraction) setLoading(true);
      setError(null);

      // Fetch all traction analytics datasets simultaneously in parallel
      const [pagesRes, statsRes, trendsRes, sourceRes] = await Promise.all([
        supabase
          .from("pages")
          .select("id, name, slug")
          .order("name", { ascending: true }),
        supabase
          .from("page_stats")
          .select("*"),
        supabase
          .from("daily_trend")
          .select("*")
          .order("report_date", { ascending: false }),
        supabase
          .from("leads_by_source")
          .select("*")
          .order("total_leads", { ascending: false }),
      ]);

      const hubPageBrief = { id: "page_frontend_hub", name: "Webpage (/)", slug: "" } as Page;
      const allPages = [hubPageBrief, ...((pagesRes.data as Page[]) || [])];
      setPages(allPages);

      const allStats = (statsRes.data as PageStat[]) || [];
      setPageStats(allStats);

      const allTrends = (trendsRes.data as DailyTrend[]) || [];
      setDailyTrends(allTrends);

      const allSources = (sourceRes.data as LeadsBySource[]) || [];
      setLeadsBySource(allSources);

      setCachedData("admin_traction", {
        pageStats: allStats,
        dailyTrends: allTrends,
        leadsBySource: allSources,
        pages: allPages,
      });
    } catch (err: any) {
      console.error("Error fetching traction analytics:", err);
      setError(err.message || "Failed to load traction analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTractionData();
  }, []);

  // Filter daily trends by selected page & date range
  const filteredTrends = useMemo(() => {
    return dailyTrends.filter((t) => {
      // 1. Page filter
      if (selectedPageId !== "all") {
        if (selectedPageId === "page_frontend_hub") {
          if (t.page_id !== "page_frontend_hub" && t.page_id !== "public_hub") return false;
        } else if (t.page_id !== selectedPageId) {
          return false;
        }
      }

      // 2. Date range filter
      if (dateRange === "custom") {
        if (customStart && t.report_date < customStart) return false;
        if (customEnd && t.report_date > customEnd) return false;
        return true;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const reportTime = new Date(t.report_date).getTime();

      if (dateRange === "today") {
        return reportTime >= startOfToday;
      } else if (dateRange === "7d") {
        return reportTime >= startOfToday - 7 * 24 * 60 * 60 * 1000;
      } else if (dateRange === "30d") {
        return reportTime >= startOfToday - 30 * 24 * 60 * 60 * 1000;
      }

      return true;
    });
  }, [dailyTrends, selectedPageId, dateRange, customStart, customEnd]);

  // Aggregate totals dynamically for the selected view & date range
  const aggregated = useMemo(() => {
    // When filtered daily trends exist, calculate exactly from filtered trends
    if (filteredTrends.length > 0) {
      const views = filteredTrends.reduce((sum, t) => sum + Number(t.views || 0), 0);
      const starts = filteredTrends.reduce((sum, t) => sum + Number(t.starts || 0), 0);
      const submits = filteredTrends.reduce((sum, t) => sum + Number(t.submits || 0), 0);
      const downloads = filteredTrends.reduce((sum, t) => sum + Number(t.downloads || 0), 0);
      const leads = filteredTrends.reduce((sum, t) => sum + Number(t.leads || 0), 0);
      const completeLeads = filteredTrends.reduce(
        (sum, t) => sum + Number(t.complete_leads || 0),
        0
      );
      const conversionRate = views > 0 ? (leads / views) * 100 : 0;

      return {
        views,
        starts,
        submits,
        downloads,
        leads,
        completeLeads,
        conversionRate,
      };
    }

    // If daily_trends has no rows at all in DB, fall back to pageStats for all-time / 30d
    if (dailyTrends.length === 0) {
      const relevantStats =
        selectedPageId === "all"
          ? pageStats
          : selectedPageId === "page_frontend_hub"
          ? pageStats.filter((s) => s.page_id === "page_frontend_hub" || s.page_id === "public_hub")
          : pageStats.filter((s) => s.page_id === selectedPageId);

      const views = relevantStats.reduce((sum, s) => sum + Number(s.views || 0), 0);
      const starts = relevantStats.reduce((sum, s) => sum + Number(s.starts || 0), 0);
      const submits = relevantStats.reduce((sum, s) => sum + Number(s.submits || 0), 0);
      const downloads = relevantStats.reduce((sum, s) => sum + Number(s.downloads || 0), 0);
      const leads = relevantStats.reduce((sum, s) => sum + Number(s.leads || 0), 0);
      const completeLeads = relevantStats.reduce(
        (sum, s) => sum + Number(s.complete_leads || 0),
        0
      );
      const conversionRate = views > 0 ? (leads / views) * 100 : 0;

      return {
        views,
        starts,
        submits,
        downloads,
        leads,
        completeLeads,
        conversionRate,
      };
    }

    // Filter returned 0 rows for this specific timeframe
    return {
      views: 0,
      starts: 0,
      submits: 0,
      downloads: 0,
      leads: 0,
      completeLeads: 0,
      conversionRate: 0,
    };
  }, [filteredTrends, dailyTrends, pageStats, selectedPageId]);

  // Filter marketing attribution leads by page & date range
  const filteredSources = useMemo(() => {
    return leadsBySource.filter((row) => {
      // 1. Page filter
      if (selectedPageId !== "all") {
        if (selectedPageId === "page_frontend_hub") {
          if (row.page_id !== "page_frontend_hub" && row.page_id !== "public_hub") return false;
        } else if (row.page_id !== selectedPageId) {
          return false;
        }
      }

      // 2. Date range filter
      if (!row.last_lead_at && !row.first_lead_at) return true;
      const leadTime = new Date(row.last_lead_at || row.first_lead_at).getTime();

      if (dateRange === "custom") {
        if (customStart && leadTime < new Date(customStart).getTime()) return false;
        if (customEnd && leadTime > new Date(customEnd + "T23:59:59").getTime()) return false;
        return true;
      }

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

      if (dateRange === "today") {
        return leadTime >= startOfToday;
      } else if (dateRange === "7d") {
        return leadTime >= startOfToday - 7 * 24 * 60 * 60 * 1000;
      } else if (dateRange === "30d") {
        return leadTime >= startOfToday - 30 * 24 * 60 * 60 * 1000;
      }

      return true;
    });
  }, [leadsBySource, selectedPageId, dateRange, customStart, customEnd]);

  return (
    <div className="space-y-6">
      {/* 1. Filter & Date Range Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Page Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <select
            value={selectedPageId}
            onChange={(e) => setSelectedPageId(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Pages (Aggregate Funnel)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Selector (Phone-first pills) */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setDateRange(item.id)}
              className={`touch-target px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateRange === item.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {dateRange === "custom" && (
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-900">Custom Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
          />
        </div>
      )}

      {/* Visual Funnel Progression */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Funnel Progression</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Step-by-step conversion pipeline</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Step 1: Views */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">1. Page Views</span>
              <span className="text-slate-900 font-bold font-mono">100%</span>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {formatNumber(aggregated.views)}
            </div>
            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-slate-500 rounded-full w-full" />
            </div>
            <p className="text-[11px] text-slate-400">Total funnel traffic</p>
          </div>

          {/* Step 2: Engaged Starts */}
          <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-blue-900">2. Engaged Visitors</span>
              <span className="text-blue-700 font-bold font-mono">
                {aggregated.views > 0
                  ? Math.round((aggregated.starts / aggregated.views) * 100)
                  : 0}%
              </span>
            </div>
            <div className="text-2xl font-black text-blue-700 font-mono">
              {formatNumber(aggregated.starts)}
            </div>
            <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{
                  width: `${
                    aggregated.views > 0
                      ? Math.min(100, Math.round((aggregated.starts / aggregated.views) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-[11px] text-blue-600/80">Started questionnaire / calculation</p>
          </div>

          {/* Step 3: Captured Leads */}
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-900">3. Leads Captured</span>
              <span className="text-emerald-700 font-bold font-mono">
                {formatPercentage(aggregated.conversionRate)}
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-700 font-mono">
              {formatNumber(aggregated.leads)}
            </div>
            <div className="h-2.5 bg-emerald-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round(aggregated.conversionRate))}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-emerald-600/80">
              {aggregated.completeLeads} full submissions
            </p>
          </div>
        </div>
      </div>

      {/* 4. Leads by Source & Keyword */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600" />
            <span>Leads by Acquisition Source & Keyword</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Marketing Attribution</span>
        </div>

        {filteredSources.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No source attribution recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Page</th>
                  <th className="py-2.5 px-3">Source</th>
                  <th className="py-2.5 px-3">Keyword</th>
                  <th className="py-2.5 px-3 text-right">Total Leads</th>
                  <th className="py-2.5 px-3 text-right">Complete</th>
                  <th className="py-2.5 px-3 text-right">Partial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSources.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {row.page_name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-blue-50 text-blue-700 capitalize">
                        {row.source}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-600">
                      {row.keyword}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatNumber(row.total_leads)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">
                      {formatNumber(row.complete_leads)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-600">
                      {formatNumber(row.partial_leads)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Daily Trend Breakdown Table & Chart */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Daily Funnel Trends</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Activity by Day</span>
        </div>

        {filteredTrends.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No daily activity recorded for the selected date range.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Page</th>
                  <th className="py-2.5 px-3 text-right">Views</th>
                  <th className="py-2.5 px-3 text-right">Starts</th>
                  <th className="py-2.5 px-3 text-right">Submits</th>
                  <th className="py-2.5 px-3 text-right">Downloads</th>
                  <th className="py-2.5 px-3 text-right">Leads</th>
                  <th className="py-2.5 px-3 text-right">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTrends.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {formatDateOnly(t.report_date)}
                    </td>
                    <td className="py-3 px-3 text-slate-700 truncate max-w-xs">
                      {t.page_name}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">
                      {formatNumber(t.views)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-blue-600">
                      {formatNumber(t.starts)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-indigo-600">
                      {formatNumber(t.submits)}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-purple-600">
                      {formatNumber(t.downloads)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900">
                      {formatNumber(t.leads)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">
                      {formatPercentage(t.conversion_percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
