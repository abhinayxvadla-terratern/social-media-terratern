"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageStat,
  DailyTrend,
  AnswerDropoff,
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
  Eye,
  Play,
  CheckCircle,
  Users,
  Percent,
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
    answerDropoffs: AnswerDropoff[];
    leadsBySource: LeadsBySource[];
    pages: Page[];
  }>("admin_traction");

  const [pageStats, setPageStats] = useState<PageStat[]>(() => cachedTraction?.pageStats || []);
  const [dailyTrends, setDailyTrends] = useState<DailyTrend[]>(() => cachedTraction?.dailyTrends || []);
  const [answerDropoffs, setAnswerDropoffs] = useState<AnswerDropoff[]>(() => cachedTraction?.answerDropoffs || []);
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

      // 1. Fetch pages for page filter
      const { data: pagesData } = await supabase
        .from("pages")
        .select("id, name, slug")
        .order("name", { ascending: true });

      const allPages = (pagesData as Page[]) || [];
      if (pagesData) setPages(allPages);

      // 2. Fetch page stats
      const { data: statsData, error: statsError } = await supabase
        .from("page_stats")
        .select("*");
      if (statsError) throw statsError;
      const allStats = (statsData as PageStat[]) || [];
      setPageStats(allStats);

      // 3. Fetch daily trend
      const { data: trendsData, error: trendsError } = await supabase
        .from("daily_trend")
        .select("*")
        .order("report_date", { ascending: false });
      if (trendsError) throw trendsError;
      const allTrends = (trendsData as DailyTrend[]) || [];
      setDailyTrends(allTrends);

      // 4. Fetch answer dropoff
      const { data: dropoffData, error: dropoffError } = await supabase
        .from("answer_dropoff")
        .select("*")
        .order("question_number", { ascending: true });
      if (dropoffError) throw dropoffError;
      const allDropoffs = (dropoffData as AnswerDropoff[]) || [];
      setAnswerDropoffs(allDropoffs);

      // 5. Fetch leads by source
      const { data: sourceData, error: sourceError } = await supabase
        .from("leads_by_source")
        .select("*")
        .order("total_leads", { ascending: false });
      if (sourceError) throw sourceError;
      const allSources = (sourceData as LeadsBySource[]) || [];
      setLeadsBySource(allSources);

      setCachedData("admin_traction", {
        pageStats: allStats,
        dailyTrends: allTrends,
        answerDropoffs: allDropoffs,
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
      // Page filter
      if (selectedPageId !== "all" && t.page_id !== selectedPageId) {
        return false;
      }

      // Date range filter
      if (dateRange === "custom") {
        if (customStart && t.report_date < customStart) return false;
        if (customEnd && t.report_date > customEnd) return false;
        return true;
      }

      const reportDate = new Date(t.report_date).getTime();
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      if (dateRange === "today") {
        return now - reportDate <= oneDay;
      } else if (dateRange === "7d") {
        return now - reportDate <= 7 * oneDay;
      } else if (dateRange === "30d") {
        return now - reportDate <= 30 * oneDay;
      }

      return true;
    });
  }, [dailyTrends, selectedPageId, dateRange, customStart, customEnd]);

  // Aggregate totals for the selected view
  const aggregated = useMemo(() => {
    const relevantStats =
      selectedPageId === "all"
        ? pageStats
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
  }, [pageStats, selectedPageId]);

  // Filtered drop-offs
  const filteredDropoffs = useMemo(() => {
    if (selectedPageId === "all") return answerDropoffs;
    return answerDropoffs.filter((d) => d.page_id === selectedPageId);
  }, [answerDropoffs, selectedPageId]);

  // Max answers for relative percentage bar
  const maxAnswers = useMemo(() => {
    return Math.max(...filteredDropoffs.map((d) => Number(d.total_answers || 0)), 1);
  }, [filteredDropoffs]);

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

      {/* 2. Top Metric Cards (5 Cards: views, starts, submits, leads, conversion %) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {/* Views */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Views
            </span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatNumber(aggregated.views)}
          </div>
          <p className="text-[10px] text-slate-400">Total funnel traffic</p>
        </div>

        {/* Starts */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Starts
            </span>
            <Play className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-600">
            {formatNumber(aggregated.starts)}
          </div>
          <p className="text-[10px] text-slate-400">
            {aggregated.views > 0
              ? `${Math.round((aggregated.starts / aggregated.views) * 100)}% start rate`
              : "0% start rate"}
          </p>
        </div>

        {/* Submits */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-indigo-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Submits
            </span>
            <CheckCircle className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">
            {formatNumber(aggregated.submits)}
          </div>
          <p className="text-[10px] text-slate-400">
            {aggregated.starts > 0
              ? `${Math.round((aggregated.submits / aggregated.starts) * 100)}% completion`
              : "0% completion"}
          </p>
        </div>

        {/* Leads */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Leads
            </span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatNumber(aggregated.leads)}
          </div>
          <p className="text-[10px] text-slate-400">
            {aggregated.completeLeads} complete submissions
          </p>
        </div>

        {/* Conversion % */}
        <div className="col-span-2 sm:col-span-1 p-4 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl shadow-md shadow-blue-600/20 space-y-1">
          <div className="flex items-center justify-between text-blue-200">
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Conversion %
            </span>
            <Percent className="w-4 h-4 text-white" />
          </div>
          <div className="text-2xl font-black">
            {formatPercentage(aggregated.conversionRate)}
          </div>
          <p className="text-[10px] text-blue-200">Leads divided by views</p>
        </div>
      </div>

      {/* 3. Visual Funnel Progression & Answer Dropoff (Side-by-side on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Funnel Progression */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Funnel Progression</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Top to Bottom</span>
          </div>

          <div className="space-y-3 pt-2">
            {/* Step 1: Views */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">1. Page Views</span>
                <span className="text-slate-900 font-bold">{formatNumber(aggregated.views)} (100%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full w-full" />
              </div>
            </div>

            {/* Dropdown indicator */}
            <div className="flex justify-center -my-1 text-slate-300">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Step 2: Engaged Starts */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">2. Engaged Visitors</span>
                <span className="text-blue-600 font-bold">
                  {formatNumber(aggregated.starts)} (
                  {aggregated.views > 0
                    ? Math.round((aggregated.starts / aggregated.views) * 100)
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      aggregated.views > 0
                        ? Math.min(100, Math.round((aggregated.starts / aggregated.views) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Dropdown indicator */}
            <div className="flex justify-center -my-1 text-slate-300">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Step 3: Captured Leads */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">3. Leads Captured</span>
                <span className="text-emerald-600 font-bold">
                  {formatNumber(aggregated.leads)} (
                  {formatPercentage(aggregated.conversionRate)})
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round(aggregated.conversionRate))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Answer Drop-off per Question */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Answer Drop-off per Question</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Question Steps</span>
          </div>

          {filteredDropoffs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No quiz answer events recorded yet for this selection.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {filteredDropoffs.map((item, idx) => {
                const percent = Math.round((item.total_answers / maxAnswers) * 100);

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        Question #{item.question_number}
                      </span>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-900">
                          {formatNumber(item.total_answers)} answers
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.unique_respondents} users)
                        </span>
                      </div>
                    </div>

                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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

        {leadsBySource.length === 0 ? (
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
                {leadsBySource.map((row, idx) => (
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
