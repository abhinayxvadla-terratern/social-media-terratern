"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PageStat,
  DailyTrend,
  LeadsBySource,
  Page,
  Lead,
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

  const [pages, setPages] = useState<Page[]>([]);
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [hubTraffic, setHubTraffic] = useState<{ views: number; form_clicks: number }>({ views: 0, form_clicks: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<"all" | "today" | "7d" | "30d" | "custom">("all");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [selectedPageId, setSelectedPageId] = useState<string>("all");

  const fetchTractionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrently query pages, leads, events, and live traffic
      const [pagesRes, leadsRes, eventsRes] = await Promise.all([
        supabase
          .from("pages")
          .select("id, name, slug, config, status")
          .order("name", { ascending: true }),
        supabase
          .from("leads")
          .select("id, name, email, phone_e164, source, keyword, page_id, utm, is_partial, created_at, page:pages(id, name, slug)")
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, page_id, type, created_at"),
      ]);

      let liveWebTraffic = { views: 0, form_clicks: 0 };
      try {
        const tRes = await fetch("/api/v1/traffic");
        if (tRes.ok) {
          const tJson = await tRes.json();
          if (tJson?.data) {
            liveWebTraffic = {
              views: Number(tJson.data.views || 0),
              form_clicks: Number(tJson.data.form_clicks || 0),
            };
          }
        }
      } catch {}

      const allPagesList = (pagesRes.data as Page[]) || [];
      const allLeadsList = (leadsRes.data as unknown as Lead[]) || [];
      const allEventsList = (eventsRes.data as any[]) || [];

      // Helper to identify leads originating from Web Page
      const isLeadFromHub = (l: any) =>
        l.page_id === "page_frontend_hub" ||
        l.page_id === "public_hub" ||
        !l.page_id ||
        l.utm?.page_origin === "frontend_hub" ||
        l.page?.slug === "" ||
        l.page?.slug === "public-hub" ||
        (l.source || "").toLowerCase() === "website_hub";

      const hubLeadsCount = allLeadsList.filter(isLeadFromHub).length;

      const manualHubViews = typeof window !== "undefined" ? localStorage.getItem("tt_hub_manual_views") : null;
      const storedHubViews = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_traffic") || 0) : 0;
      const storedHubClicks = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_form_clicks") || 0) : 0;

      const finalHubViews = manualHubViews !== null && manualHubViews !== "" && !isNaN(Number(manualHubViews))
        ? Number(manualHubViews)
        : Math.max(liveWebTraffic.views, storedHubViews, 0);

      const finalHubClicks = Math.max(liveWebTraffic.form_clicks, storedHubClicks, hubLeadsCount);

      const hubPageBrief: Page = {
        id: "page_frontend_hub",
        page_key: "public_hub",
        name: "Web Page (/)",
        slug: "",
        page_type: "custom",
        status: "live",
        start_at: null,
        end_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        keyword: null,
        page_url: "/",
        closed_message: null,
        closed_redirect_url: null,
        pdf_asset_id: null,
        allowed_origins: [],
        views_count: finalHubViews,
        leads_count: hubLeadsCount,
        conversion_percentage: finalHubViews > 0 ? Number(((hubLeadsCount / finalHubViews) * 100).toFixed(1)) : (hubLeadsCount > 0 ? 100 : 0),
        config: { form_clicks: finalHubClicks },
      };

      const fullPages = [hubPageBrief, ...allPagesList];
      setPages(fullPages);
      setRawLeads(allLeadsList);
      setRawEvents(allEventsList);
      setHubTraffic({ views: finalHubViews, form_clicks: finalHubClicks });
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

  const isLeadFromHub = (l: any) =>
    l.page_id === "page_frontend_hub" ||
    l.page_id === "public_hub" ||
    !l.page_id ||
    l.utm?.page_origin === "frontend_hub" ||
    l.page?.slug === "" ||
    l.page?.slug === "public-hub" ||
    (l.source || "").toLowerCase() === "website_hub";

  const activePages = useMemo(() => {
    return pages.filter((p) => p.status === "live");
  }, [pages]);

  const activePageIds = useMemo(() => {
    return new Set(activePages.map((p) => p.id));
  }, [activePages]);

  const matchesPage = (pageId: string | null | undefined, lead?: any) => {
    if (selectedPageId !== "all") {
      if (selectedPageId === "page_frontend_hub") {
        return pageId === "page_frontend_hub" || pageId === "public_hub" || (lead && isLeadFromHub(lead));
      }
      return pageId === selectedPageId;
    }
    return !pageId || activePageIds.has(pageId) || (lead && isLeadFromHub(lead));
  };

  const getLocalDateString = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso.split("T")[0];
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return iso.split("T")[0];
    }
  };

  const matchesDate = (isoStr: string) => {
    if (!isoStr || dateRange === "all") return true;
    const itemDate = new Date(isoStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    if (dateRange === "today") {
      const isCalendarToday =
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate();
      const isLast24h =
        now.getTime() - itemDate.getTime() <= 24 * 60 * 60 * 1000 &&
        itemDate.getTime() <= now.getTime();
      return isCalendarToday || isLast24h;
    }
    if (dateRange === "7d") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= sevenDaysAgo;
    }
    if (dateRange === "30d") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= thirtyDaysAgo;
    }
    if (dateRange === "custom") {
      if (customStart) {
        const start = new Date(`${customStart}T00:00:00`);
        if (!isNaN(start.getTime()) && itemDate < start) return false;
      }
      if (customEnd) {
        const end = new Date(`${customEnd}T23:59:59.999`);
        if (!isNaN(end.getTime()) && itemDate > end) return false;
      }
      return true;
    }
    return true;
  };

  // Compute daily trends dynamically from events and leads
  const filteredTrends = useMemo(() => {
    const dayMap = new Map<string, {
      report_date: string;
      page_id: string;
      page_name: string;
      page_slug: string;
      views: number;
      starts: number;
      submits: number;
      downloads: number;
      leads: number;
      complete_leads: number;
      partial_leads: number;
    }>();

    // 1. Process events
    rawEvents.forEach((ev) => {
      if (!matchesPage(ev.page_id)) return;
      if (!matchesDate(ev.created_at)) return;
      const date = getLocalDateString(ev.created_at);
      const p = pages.find((page) => page.id === ev.page_id);
      const isHub = ev.page_id === "page_frontend_hub" || ev.page_id === "public_hub";
      const pageId = isHub ? "page_frontend_hub" : ev.page_id;
      const pageName = isHub ? "Web Page (/)" : (p?.name || "Landing Page");
      const key = `${date}_${pageId}`;

      let record = dayMap.get(key);
      if (!record) {
        record = {
          report_date: date,
          page_id: pageId,
          page_name: pageName,
          page_slug: isHub ? "" : (p?.slug || ""),
          views: 0,
          starts: 0,
          submits: 0,
          downloads: 0,
          leads: 0,
          complete_leads: 0,
          partial_leads: 0,
        };
        dayMap.set(key, record);
      }

      if (ev.type === "view") record.views += 1;
      else if (ev.type === "start") record.starts += 1;
      else if (ev.type === "submit" || ev.type === "lead_submit") record.submits += 1;
      else if (ev.type === "download") record.downloads += 1;
    });

    // 2. Process leads
    rawLeads.forEach((l) => {
      if (!matchesPage(l.page_id, l)) return;
      if (!matchesDate(l.created_at)) return;
      const date = getLocalDateString(l.created_at);
      const isHub = isLeadFromHub(l);
      const pageId = isHub ? "page_frontend_hub" : (l.page_id || "unknown");
      const p = pages.find((page) => page.id === pageId);
      const pageName = isHub ? "Web Page (/)" : (p?.name || l.page?.name || "Landing Page");
      const key = `${date}_${pageId}`;

      let record = dayMap.get(key);
      if (!record) {
        record = {
          report_date: date,
          page_id: pageId,
          page_name: pageName,
          page_slug: isHub ? "" : (p?.slug || l.page?.slug || ""),
          views: 0,
          starts: 0,
          submits: 0,
          downloads: 0,
          leads: 0,
          complete_leads: 0,
          partial_leads: 0,
        };
        dayMap.set(key, record);
      }

      record.leads += 1;
      record.submits += 1;
      if (l.is_partial) record.partial_leads += 1;
      else record.complete_leads += 1;
    });

    // 3. For Web Page: ensure live verified views & form clicks are represented for today
    if (selectedPageId === "page_frontend_hub" || selectedPageId === "all") {
      const todayIso = new Date().toISOString();
      if (matchesDate(todayIso) && (hubTraffic.views > 0 || hubTraffic.form_clicks > 0)) {
        const todayStr = getLocalDateString(todayIso);
        const hubKey = `${todayStr}_page_frontend_hub`;
        let hubRecord = dayMap.get(hubKey);
        if (!hubRecord) {
          hubRecord = {
            report_date: todayStr,
            page_id: "page_frontend_hub",
            page_name: "Web Page (/)",
            page_slug: "",
            views: hubTraffic.views,
            starts: hubTraffic.form_clicks,
            submits: 0,
            downloads: 0,
            leads: 0,
            complete_leads: 0,
            partial_leads: 0,
          };
          dayMap.set(hubKey, hubRecord);
        } else {
          hubRecord.views = Math.max(hubRecord.views, hubTraffic.views);
          hubRecord.starts = Math.max(hubRecord.starts, hubTraffic.form_clicks);
        }
      }
    }

    return Array.from(dayMap.values())
      .map((t) => {
        const v = Math.max(t.views, t.leads);
        const conv = v > 0 ? Number(((t.leads / v) * 100).toFixed(1)) : (t.leads > 0 ? 100 : 0);
        return {
          ...t,
          views: v,
          starts: Math.max(t.starts, t.leads),
          conversion_percentage: conv,
        };
      })
      .sort((a, b) => b.report_date.localeCompare(a.report_date));
  }, [rawEvents, rawLeads, pages, hubTraffic, selectedPageId, dateRange, customStart, customEnd]);

  // Aggregate totals dynamically for the selected view & date range (unified with Overview)
  const aggregated = useMemo(() => {
    // 1. Leads matching page and date
    const matchedLeads = rawLeads.filter((l) => {
      if (!matchesPage(l.page_id, l)) return false;
      return matchesDate(l.created_at);
    });

    const leads = matchedLeads.length;
    const completeLeads = matchedLeads.filter((l) => !l.is_partial).length;

    // 2. Events matching page and date
    let viewsFromEvents = 0;
    let startsFromEvents = 0;
    let downloadsFromEvents = 0;

    rawEvents.forEach((ev) => {
      if (!matchesPage(ev.page_id)) return;
      if (!matchesDate(ev.created_at)) return;
      if (ev.type === "view") viewsFromEvents++;
      else if (ev.type === "start") startsFromEvents++;
      else if (ev.type === "download") downloadsFromEvents++;
    });

    const isDateRestricted = dateRange !== "all";
    const isTodayIncluded = matchesDate(new Date().toISOString());

    // 3. Baseline stats from page configs (work application 229, nursing 19, etc. + web page)
    let viewsFromStats = 0;
    let startsFromStats = 0;

    if (selectedPageId === "page_frontend_hub") {
      viewsFromStats = hubTraffic.views;
      startsFromStats = hubTraffic.form_clicks;
    } else {
      pages.forEach((p) => {
        if (p.id === "page_frontend_hub") return;
        if (selectedPageId !== "all" && p.id !== selectedPageId) return;
        if (selectedPageId === "all" && p.status !== "live") return;

        const configViews = Number(p.config?.views_count ?? p.config?.manual_views ?? 0);
        viewsFromStats += configViews;
        startsFromStats += Number((p.config as any)?.form_clicks ?? 0);
      });

      if (selectedPageId === "all") {
        viewsFromStats += hubTraffic.views;
        startsFromStats += hubTraffic.form_clicks;
      }
    }

    let views = 0;
    if (selectedPageId === "page_frontend_hub") {
      views = isDateRestricted
        ? (isTodayIncluded ? Math.max(hubTraffic.views, leads) : leads)
        : Math.max(viewsFromStats, leads);
    } else if (isDateRestricted) {
      const hubViewsToAdd = (selectedPageId === "all" && isTodayIncluded) ? hubTraffic.views : 0;
      views = Math.max(viewsFromEvents + hubViewsToAdd, leads);
    } else {
      views = Math.max(viewsFromStats, viewsFromEvents, leads);
    }

    let starts = 0;
    if (selectedPageId === "page_frontend_hub") {
      starts = isDateRestricted
        ? (isTodayIncluded ? Math.max(hubTraffic.form_clicks, leads) : leads)
        : Math.max(startsFromStats, leads);
    } else if (isDateRestricted) {
      const hubStartsToAdd = (selectedPageId === "all" && isTodayIncluded) ? hubTraffic.form_clicks : 0;
      starts = Math.max(startsFromEvents + hubStartsToAdd, leads);
    } else {
      starts = Math.max(startsFromStats, startsFromEvents, leads);
    }

    const conversionRate = views > 0
      ? Number(((leads / views) * 100).toFixed(1))
      : (leads > 0 ? 100 : 0);

    return {
      views,
      starts,
      submits: leads,
      downloads: downloadsFromEvents,
      leads,
      completeLeads,
      conversionRate,
    };
  }, [rawLeads, rawEvents, pages, hubTraffic, selectedPageId, dateRange, customStart, customEnd, activePageIds]);

  // Filter marketing attribution leads by page & date range
  const filteredSources = useMemo(() => {
    const matchedLeads = rawLeads.filter((l) => {
      if (!matchesPage(l.page_id, l)) return false;
      return matchesDate(l.created_at);
    });

    const map = new Map<string, LeadsBySource>();
    matchedLeads.forEach((l) => {
      const isHub = isLeadFromHub(l);
      const pageId = isHub ? "page_frontend_hub" : (l.page_id || "unknown");
      const p = pages.find((page) => page.id === pageId);
      const pageName = isHub ? "Web Page (/)" : (p?.name || l.page?.name || "Landing Page");
      const pageSlug = isHub ? "" : (p?.slug || l.page?.slug || "");
      const source = (l.source || "direct").toLowerCase();
      const keyword = (l.keyword || (l.utm as any)?.utm_term || (l.utm as any)?.keyword || "direct").toLowerCase();

      const key = `${pageId}_${source}_${keyword}`;
      const existing = map.get(key);
      if (existing) {
        existing.total_leads += 1;
        if (l.is_partial) existing.partial_leads += 1;
        else existing.complete_leads += 1;
        if (l.created_at) {
          if (!existing.last_lead_at || l.created_at > existing.last_lead_at) {
            existing.last_lead_at = l.created_at;
          }
          if (!existing.first_lead_at || l.created_at < existing.first_lead_at) {
            existing.first_lead_at = l.created_at;
          }
        }
      } else {
        map.set(key, {
          page_id: pageId,
          page_name: pageName,
          page_slug: pageSlug,
          source,
          keyword,
          total_leads: 1,
          complete_leads: l.is_partial ? 0 : 1,
          partial_leads: l.is_partial ? 1 : 0,
          first_lead_at: l.created_at || new Date().toISOString(),
          last_lead_at: l.created_at || new Date().toISOString(),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total_leads - a.total_leads);
  }, [rawLeads, pages, selectedPageId, dateRange, customStart, customEnd]);

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

        {/* Date Range Selector (Phone-first pills) + Quick Refresh */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { id: "all", label: "All Time" },
              { id: "today", label: "Today" },
              { id: "7d", label: "7 Days" },
              { id: "30d", label: "30 Days" },
              { id: "custom", label: "Custom" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setDateRange(item.id);
                if (item.id !== "custom") {
                  setCustomStart("");
                  setCustomEnd("");
                }
              }}
              className={`touch-target px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dateRange === item.id
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={() => fetchTractionData()}
            disabled={loading}
            title="Refresh analytics data"
            className="touch-target p-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center disabled:opacity-50 ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Inputs if selected */}
      {dateRange === "custom" && (
        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-wrap items-center gap-3 text-xs animate-in fade-in">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className="font-semibold text-blue-900">Custom Range:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">From</span>
            <input
              type="date"
              value={customStart}
              max={customEnd || undefined}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">To</span>
            <input
              type="date"
              value={customEnd}
              min={customStart || undefined}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs"
            />
          </div>
          {(customStart || customEnd) && (
            <button
              onClick={() => {
                setCustomStart("");
                setCustomEnd("");
              }}
              className="text-[11px] font-semibold text-blue-600 hover:underline ml-2"
            >
              Clear
            </button>
          )}
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
