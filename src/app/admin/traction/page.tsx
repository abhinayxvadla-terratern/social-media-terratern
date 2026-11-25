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
  Users,
  Eye,
  Flame,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";
import { cleanPageName } from "@/lib/vibe-engine";

export default function TractionAnalyticsPage() {
  const { userRole } = useAdmin();
  const supabase = createClient();

  const [pages, setPages] = useState<Page[]>([]);
  const [rawLeads, setRawLeads] = useState<Lead[]>([]);
  const [rawEvents, setRawEvents] = useState<any[]>([]);
  const [pageStats, setPageStats] = useState<PageStat[]>([]);
  const [hubTraffic, setHubTraffic] = useState<{ views: number; form_clicks: number }>({ views: 0, form_clicks: 0 });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (Synchronized with Overview top filters)
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<"all" | "today" | "7d" | "30d" | "this_month" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [leadStatus, setLeadStatus] = useState<"all" | "complete" | "partial">("all");

  const fetchTractionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Concurrently query pages, leads, events, stats, and live traffic
      const [pagesRes, leadsRes, eventsRes, statsRes] = await Promise.all([
        supabase
          .from("pages")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("leads")
          .select("*, page:pages(id, name, slug)")
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, page_id, type, created_at"),
        supabase
          .from("page_stats")
          .select("*"),
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
      const allStatsList = (statsRes.data as PageStat[]) || [];

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
      const hubStat = allStatsList.find((s) => s.page_id === "page_frontend_hub" || s.page_id === "public_hub");

      const manualHubViews = typeof window !== "undefined" ? localStorage.getItem("tt_hub_manual_views") : null;
      const storedHubViews = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_traffic") || 0) : 0;
      const storedHubClicks = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_form_clicks") || 0) : 0;

      const finalHubViews = manualHubViews !== null && manualHubViews !== "" && !isNaN(Number(manualHubViews))
        ? Number(manualHubViews)
        : Math.max(hubStat?.views ?? 0, liveWebTraffic.views, storedHubViews, 0);

      const finalHubClicks = Math.max(hubStat?.starts ?? 0, liveWebTraffic.form_clicks, storedHubClicks, hubLeadsCount);

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
        config: { form_clicks: finalHubClicks, views_count: finalHubViews },
      };

      const fullPages = [hubPageBrief, ...allPagesList];
      setPages(fullPages);
      setRawLeads(allLeadsList);
      setRawEvents(allEventsList);
      setPageStats(allStatsList);
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

  function getChannelInfo(source: string | null | undefined): { label: string; color: string; dotColor: string } {
    const s = (source || "").toLowerCase().trim();
    if (!s || s === "direct" || s === "direct / organic" || s === "none" || s === "null") {
      return {
        label: "Direct / Organic",
        color: "bg-slate-700",
        dotColor: "bg-slate-500",
      };
    }
    if (s.includes("ig") || s.includes("instagram")) {
      if (s.includes("dm")) {
        return {
          label: "Instagram DM",
          color: "bg-gradient-to-r from-purple-500 to-pink-500",
          dotColor: "bg-pink-500",
        };
      }
      if (s.includes("bio")) {
        return {
          label: "Instagram Bio",
          color: "bg-pink-500",
          dotColor: "bg-pink-500",
        };
      }
      return {
        label: "Instagram",
        color: "bg-gradient-to-r from-purple-500 to-pink-500",
        dotColor: "bg-pink-500",
      };
    }
    if (s.includes("wa") || s.includes("whatsapp")) {
      return {
        label: "WhatsApp Direct",
        color: "bg-emerald-500",
        dotColor: "bg-emerald-500",
      };
    }
    if (s.includes("fb") || s.includes("facebook")) {
      return {
        label: "Facebook Ads",
        color: "bg-blue-600",
        dotColor: "bg-blue-600",
      };
    }
    if (s.includes("linkedin")) {
      return {
        label: "LinkedIn",
        color: "bg-sky-600",
        dotColor: "bg-sky-600",
      };
    }
    if (s.includes("youtube") || s.includes("yt")) {
      return {
        label: "YouTube",
        color: "bg-red-600",
        dotColor: "bg-red-600",
      };
    }
    if (s.includes("google")) {
      return {
        label: "Google Search / Ads",
        color: "bg-amber-500",
        dotColor: "bg-amber-500",
      };
    }
    if (s.includes("email") || s.includes("newsletter")) {
      return {
        label: "Email Campaign",
        color: "bg-indigo-600",
        dotColor: "bg-indigo-600",
      };
    }
    if (s.includes("manychat") || s.includes("auto_connector") || s.includes("connector")) {
      return {
        label: "ManyChat Automation",
        color: "bg-purple-600",
        dotColor: "bg-purple-500",
      };
    }
    return {
      label: (source || "Direct").charAt(0).toUpperCase() + (source || "Direct").slice(1),
      color: "bg-slate-800",
      dotColor: "bg-slate-400",
    };
  }

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

  const activeSources = useMemo(() => {
    const sourcesSet = new Set<string>();
    rawLeads.forEach((lead) => {
      if (matchesPage(lead.page_id, lead)) {
        const info = getChannelInfo(lead.source);
        if (info.label) sourcesSet.add(info.label);
      }
    });
    return Array.from(sourcesSet).sort();
  }, [rawLeads, activePageIds, selectedPageId]);

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
    if (!isoStr || timeRange === "all") return true;
    const itemDate = new Date(isoStr);
    if (isNaN(itemDate.getTime())) return true;

    const now = new Date();
    if (timeRange === "today") {
      const isCalendarToday =
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth() &&
        itemDate.getDate() === now.getDate();
      const isLast24h =
        now.getTime() - itemDate.getTime() <= 24 * 60 * 60 * 1000 &&
        itemDate.getTime() <= now.getTime();
      return isCalendarToday || isLast24h;
    }
    if (timeRange === "7d") {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return itemDate >= sevenDaysAgo;
    }
    if (timeRange === "30d") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return itemDate >= thirtyDaysAgo;
    }
    if (timeRange === "this_month") {
      return (
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth()
      );
    }
    if (timeRange === "custom") {
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
  };

  const isFiltered =
    selectedPageId !== "all" ||
    selectedSource !== "all" ||
    timeRange !== "all" ||
    leadStatus !== "all" ||
    Boolean(startDate || endDate);

  const handleResetFilters = () => {
    setSelectedPageId("all");
    setSelectedSource("all");
    setTimeRange("all");
    setStartDate("");
    setEndDate("");
    setLeadStatus("all");
  };

  // Compute 4 Executive Metric Cards (Exact match with Overview)
  const computedData = useMemo(() => {
    // 1. Filter Leads
    const filteredLeads = rawLeads.filter((lead) => {
      if (!matchesDate(lead.created_at)) return false;
      if (!matchesPage(lead.page_id, lead)) return false;

      if (selectedSource !== "all") {
        const info = getChannelInfo(lead.source);
        if (info.label !== selectedSource) return false;
      }

      if (leadStatus === "complete" && lead.is_partial) return false;
      if (leadStatus === "partial" && !lead.is_partial) return false;

      return true;
    });

    const totalLeads = filteredLeads.length;
    const completeLeads = filteredLeads.filter((l) => !l.is_partial).length;
    const partialLeads = filteredLeads.filter((l) => l.is_partial).length;
    const activeLeads = leadStatus === "complete" ? completeLeads : leadStatus === "partial" ? partialLeads : totalLeads;

    // 2. Filter Events
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

    const isDateRestricted = timeRange !== "all" && (timeRange !== "custom" || Boolean(startDate || endDate));
    const isSourceRestricted = selectedSource !== "all";
    const isTodayIncluded = matchesDate(new Date().toISOString());

    const sourceRatio = isSourceRestricted && rawLeads.length > 0
      ? Math.max(0.05, totalLeads / rawLeads.length)
      : 1;

    let viewsFromStats = 0;
    let startsFromStats = 0;
    let downloadsFromStats = 0;

    const hubPageObj = pages.find((p) => p.id === "page_frontend_hub");

    if (selectedPageId === "page_frontend_hub") {
      viewsFromStats = hubPageObj?.views_count || hubTraffic.views || 0;
      startsFromStats = (hubPageObj?.config as any)?.form_clicks || hubTraffic.form_clicks || 0;
    } else {
      pages.forEach((p) => {
        if (p.id === "page_frontend_hub") return;
        if (selectedPageId !== "all" && p.id !== selectedPageId) return;
        if (selectedPageId === "all" && p.status !== "live") return;

        const stat = pageStats.find((s) => s.page_id === p.id);
        const configViews = Number(p.config?.views_count ?? p.config?.manual_views ?? 0);
        const pViews = configViews > 0 ? configViews : (stat?.views || 0);
        const pStarts = Number((p.config as any)?.form_clicks ?? stat?.starts ?? 0);
        const pDownloads = Number(stat?.downloads || 0);

        viewsFromStats += pViews;
        startsFromStats += pStarts;
        downloadsFromStats += pDownloads;
      });

      if (selectedPageId === "all" && hubPageObj) {
        viewsFromStats += hubPageObj.views_count || hubTraffic.views || 0;
        startsFromStats += (hubPageObj.config as any)?.form_clicks || hubTraffic.form_clicks || 0;
      }
    }

    let totalViews = 0;
    if (selectedPageId === "page_frontend_hub") {
      totalViews = Math.max(viewsFromStats, totalLeads);
    } else if (isDateRestricted) {
      const hubViewsToAdd = (selectedPageId === "all" && hubPageObj) ? (hubPageObj.views_count || hubTraffic.views || 0) : 0;
      totalViews = Math.max(viewsFromEvents + hubViewsToAdd, totalLeads);
    } else if (isSourceRestricted) {
      totalViews = Math.max(viewsFromEvents, Math.round(viewsFromStats * sourceRatio), totalLeads);
    } else {
      totalViews = Math.max(viewsFromStats, viewsFromEvents, totalLeads);
    }

    let totalStarts = 0;
    if (selectedPageId === "page_frontend_hub") {
      totalStarts = Math.max(startsFromStats, totalLeads);
    } else if (isDateRestricted) {
      const hubStartsToAdd = (selectedPageId === "all" && hubPageObj) ? ((hubPageObj.config as any)?.form_clicks || hubTraffic.form_clicks || 0) : 0;
      totalStarts = Math.max(startsFromEvents + hubStartsToAdd, totalLeads);
    } else if (isSourceRestricted) {
      totalStarts = Math.max(startsFromEvents, Math.round(startsFromStats * sourceRatio), totalLeads);
    } else {
      totalStarts = Math.max(startsFromStats, startsFromEvents, totalLeads);
    }

    const conversionRate = totalViews > 0
      ? Number(((activeLeads / totalViews) * 100).toFixed(1))
      : (activeLeads > 0 ? 100 : 0);

    const relevantPages = selectedPageId !== "all"
      ? pages.filter((p) => p.id === selectedPageId)
      : activePages;

    const activePagesCount = selectedPageId !== "all"
      ? relevantPages.filter((p) => p.status === "live").length
      : relevantPages.filter((p) => p.status === "live").length;

    return {
      totalLeads,
      completeLeads,
      partialLeads,
      activeLeads,
      totalViews,
      totalStarts,
      conversionRate,
      activePagesCount,
      filteredLeads,
    };
  }, [rawLeads, rawEvents, pages, pageStats, hubTraffic, selectedPageId, selectedSource, timeRange, startDate, endDate, leadStatus, activePageIds]);

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
    computedData.filteredLeads.forEach((l) => {
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
  }, [rawEvents, computedData.filteredLeads, pages, hubTraffic, selectedPageId, timeRange, startDate, endDate]);

  // Filter marketing attribution leads by page & date range
  const filteredSources = useMemo(() => {
    const map = new Map<string, LeadsBySource>();
    computedData.filteredLeads.forEach((l) => {
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
  }, [computedData.filteredLeads, pages]);

  return (
    <div className="space-y-6">
      {/* 1. Global Filter Bar (Matches Attached UI) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
        {/* Filter Title & Reset */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Filters
            </span>
          </div>
          <div className="flex items-center gap-3">
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
            <button
              onClick={() => fetchTractionData()}
              disabled={loading}
              title="Refresh analytics data"
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
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

          {/* Source Filter */}
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
                  const val = e.target.value as any;
                  setTimeRange(val);
                  if (val !== "custom") {
                    setStartDate("");
                    setEndDate("");
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

            {timeRange === "custom" && (
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
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value as any)}
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

      {/* 2. Top Executive KPI Cards (4 Metric Cards - Exact replica of attached UI) */}
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
            {loading ? "—" : formatNumber(computedData.activeLeads)}
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
            {loading ? "—" : formatPercentage(computedData.conversionRate)}
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
            {loading ? "—" : formatNumber(computedData.totalViews)}
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
            {loading ? "—" : computedData.activePagesCount}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Out of {pages.length} total pages
          </p>
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
