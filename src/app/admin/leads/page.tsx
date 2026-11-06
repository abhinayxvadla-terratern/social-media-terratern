"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lead, Page, FunnelEvent } from "@/lib/types";
import { useAdmin } from "@/contexts/AdminContext";
import { Modal } from "@/components/ui/Modal";
import {
  formatDate,
  formatNumber,
  exportToCSV,
} from "@/lib/utils";
import { cleanPageName } from "@/lib/vibe-engine";
import {
  Search,
  Download,
  Filter,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Mail,
  MessageCircle,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Tag,
  Share2,
  Trash2,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";

function formatDateParts(dateString: string | null | undefined): { date: string; time: string } {
  if (!dateString) return { date: "—", time: "" };
  try {
    const d = new Date(dateString);
    const date = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(d);
    const time = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(d);
    return { date, time };
  } catch {
    return { date: dateString, time: "" };
  }
}

export default function LeadsManagementPage() {
  const { userRole } = useAdmin();
  const supabase = createClient();

  const cachedLeads = getCachedData<Lead[]>("admin_leads");
  const cachedPages = getCachedData<Page[]>("admin_pages_brief");

  const [leads, setLeads] = useState<Lead[]>(() => cachedLeads || []);
  const [pages, setPages] = useState<Page[]>(() => cachedPages || []);
  const [loading, setLoading] = useState(() => !cachedLeads);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPageId, setSelectedPageId] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedKeyword, setSelectedKeyword] = useState<string>("all");
  const [selectedCompleteness, setSelectedCompleteness] = useState<string>("all");
  const [selectedDuplication, setSelectedDuplication] = useState<string>("all");

  // Lead Timeline Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadEvents, setLeadEvents] = useState<FunnelEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Lead Deletion Modal State
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch leads and pages
  const fetchData = async () => {
    try {
      if (!cachedLeads) setLoading(true);
      setError(null);

      // Fetch pages for filter dropdown
      const { data: pagesData } = await supabase
        .from("pages")
        .select("id, name, slug")
        .order("name", { ascending: true });

      if (pagesData) {
        setPages(pagesData as Page[]);
        setCachedData("admin_pages_brief", pagesData);
      }

      // Fetch leads with page relationship
      const { data: leadsData, error: leadsError } = await supabase
        .from("leads")
        .select("*, page:pages(id, name, slug)")
        .order("created_at", { ascending: false });

      if (leadsError) throw leadsError;
      const allLeads = (leadsData as Lead[]) || [];
      setLeads(allLeads);
      setCachedData("admin_leads", allLeads);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError(err.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute lead duplication and multi-page drop counts across all leads
  const contactDropMap = useMemo(() => {
    const map: Record<string, { count: number; pageNames: Set<string>; pageIds: Set<string> }> = {};

    leads.forEach((l) => {
      const keys: string[] = [];
      if (l.phone_e164) keys.push(`p:${l.phone_e164.trim()}`);
      if (l.email) keys.push(`e:${l.email.trim().toLowerCase()}`);

      const pageTitle = cleanPageName(l.page?.name || l.page_id || "Direct");

      keys.forEach((k) => {
        if (!map[k]) {
          map[k] = { count: 0, pageNames: new Set(), pageIds: new Set() };
        }
        map[k].count += 1;
        map[k].pageNames.add(pageTitle);
        if (l.page_id) map[k].pageIds.add(l.page_id);
      });
    });

    return map;
  }, [leads]);

  const getLeadDropInfo = (lead: Lead) => {
    let maxCount = 1;
    const pageNames = new Set<string>();
    const pageIds = new Set<string>();

    if (lead.phone_e164) {
      const info = contactDropMap[`p:${lead.phone_e164.trim()}`];
      if (info) {
        maxCount = Math.max(maxCount, info.count);
        info.pageNames.forEach((p) => pageNames.add(p));
        info.pageIds.forEach((id) => pageIds.add(id));
      }
    }

    if (lead.email) {
      const info = contactDropMap[`e:${lead.email.trim().toLowerCase()}`];
      if (info) {
        maxCount = Math.max(maxCount, info.count);
        info.pageNames.forEach((p) => pageNames.add(p));
        info.pageIds.forEach((id) => pageIds.add(id));
      }
    }

    return {
      dropCount: maxCount,
      isDuplicate: maxCount > 1,
      pageCount: pageNames.size,
      pages: Array.from(pageNames),
    };
  };

  // Delete lead handler
  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete) return;
    setIsDeleting(true);
    try {
      // 1. Try direct authenticated delete with Supabase client
      const { error: clientDelErr } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadToDelete.id);

      // 2. Fallback to API route if client delete threw error
      if (clientDelErr) {
        const res = await fetch(`/api/v1/leads?id=${leadToDelete.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(clientDelErr.message || data.error || "Failed to delete lead.");
        }
      }

      const updated = leads.filter((l) => l.id !== leadToDelete.id);
      setLeads(updated);
      setCachedData("admin_leads", updated);
      if (selectedLead?.id === leadToDelete.id) {
        setSelectedLead(null);
      }
      setLeadToDelete(null);
    } catch (err: any) {
      alert(err.message || "A network error occurred while deleting the lead.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch timeline events when a lead is selected
  const handleOpenLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setLoadingEvents(true);
    setLeadEvents([]);

    try {
      let query = supabase.from("events").select("*");

      if (lead.visitor_id) {
        query = query.or(`lead_id.eq.${lead.id},visitor_id.eq.${lead.visitor_id}`);
      } else {
        query = query.eq("lead_id", lead.id);
      }

      const { data: eventsData, error: eventsError } = await query.order(
        "created_at",
        { ascending: true }
      );

      if (eventsError) throw eventsError;
      setLeadEvents((eventsData as FunnelEvent[]) || []);
    } catch (err) {
      console.error("Error fetching lead timeline:", err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Distinct sources and keywords for filters
  const uniqueSources = useMemo(() => {
    return Array.from(
      new Set(leads.map((l) => l.source).filter(Boolean))
    ) as string[];
  }, [leads]);

  const uniqueKeywords = useMemo(() => {
    return Array.from(
      new Set(leads.map((l) => l.keyword).filter(Boolean))
    ) as string[];
  }, [leads]);

  // Apply filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        (lead.name && lead.name.toLowerCase().includes(searchLower)) ||
        (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
        (lead.phone_e164 && lead.phone_e164.toLowerCase().includes(searchLower)) ||
        (lead.source && lead.source.toLowerCase().includes(searchLower)) ||
        (lead.keyword && lead.keyword.toLowerCase().includes(searchLower));

      // Page
      const matchesPage =
        selectedPageId === "all" ? true : lead.page_id === selectedPageId;

      // Source
      const matchesSource =
        selectedSource === "all" ? true : lead.source === selectedSource;

      // Keyword
      const matchesKeyword =
        selectedKeyword === "all" ? true : lead.keyword === selectedKeyword;

      // Completeness
      const matchesCompleteness =
        selectedCompleteness === "all"
          ? true
          : selectedCompleteness === "complete"
          ? !lead.is_partial
          : lead.is_partial;

      // Duplication filter
      const dropInfo = getLeadDropInfo(lead);
      let matchesDuplication = true;
      if (selectedDuplication === "duplicates") {
        matchesDuplication = dropInfo.isDuplicate;
      } else if (selectedDuplication === "crosspage") {
        matchesDuplication = dropInfo.pageCount > 1;
      } else if (selectedDuplication === "unique") {
        matchesDuplication = !dropInfo.isDuplicate;
      }

      // Date Range
      let matchesDate = true;
      if (selectedDateRange !== "all") {
        const leadDate = new Date(lead.created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;

        if (selectedDateRange === "today") {
          matchesDate = now - leadDate <= oneDay;
        } else if (selectedDateRange === "7d") {
          matchesDate = now - leadDate <= 7 * oneDay;
        } else if (selectedDateRange === "30d") {
          matchesDate = now - leadDate <= 30 * oneDay;
        }
      }

      return (
        matchesSearch &&
        matchesPage &&
        matchesSource &&
        matchesKeyword &&
        matchesCompleteness &&
        matchesDuplication &&
        matchesDate
      );
    });
  }, [
    leads,
    search,
    selectedPageId,
    selectedSource,
    selectedKeyword,
    selectedCompleteness,
    selectedDuplication,
    selectedDateRange,
    contactDropMap,
  ]);

  // CSV Export
  const handleExportCSV = () => {
    const exportRows = filteredLeads.map((lead) => {
      const dropInfo = getLeadDropInfo(lead);
      return {
        ID: lead.id,
        Name: lead.name || "Anonymous",
        Email: lead.email || "",
        Phone: lead.phone_e164 || "",
        Drop_Count: dropInfo.dropCount,
        Pages_Count: dropInfo.pageCount,
        Pages_List: dropInfo.pages.join("; "),
        Country: lead.country_code || "",
        Page: lead.page?.name || lead.page_id,
        Status: lead.is_partial ? "Partial Dropoff" : "Completed Lead",
        Quiz_Score: lead.quiz_score ?? "",
        Quiz_Result: lead.quiz_result || "",
        Source: lead.source || "",
        Keyword: lead.keyword || "",
        Post_ID: lead.post_id || "",
        Consent: lead.consent ? "Yes" : "No",
        Visitor_ID: lead.visitor_id || "",
        Created_At: lead.created_at,
        UTM_Source: lead.utm?.utm_source || "",
        UTM_Medium: lead.utm?.utm_medium || "",
        UTM_Campaign: lead.utm?.utm_campaign || "",
      };
    });

    exportToCSV("terratern_leads_export", exportRows);
  };

  const repeatLeadsCount = useMemo(() => {
    return leads.filter((l) => getLeadDropInfo(l).isDuplicate).length;
  }, [leads, contactDropMap]);

  return (
    <div className="space-y-6">
      {/* 1. Key Numbers on Top (Avg Quiz Score REMOVED, Repeat Drops Added) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Leads
          </span>
          <span className="text-2xl font-black text-slate-900">
            {formatNumber(leads.length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Completed
          </span>
          <span className="text-2xl font-black text-emerald-600">
            {formatNumber(leads.filter((l) => !l.is_partial).length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
            Partial Dropoffs
          </span>
          <span className="text-2xl font-black text-amber-600">
            {formatNumber(leads.filter((l) => l.is_partial).length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 block mb-1">
            Repeat Drops
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-purple-600">
              {formatNumber(repeatLeadsCount)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">multi-page drops</span>
          </div>
        </div>
      </div>

      {/* 2. Search, Filter Bar & CSV Export */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
        {/* Top search & CSV row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name, email, phone, keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredLeads.length === 0}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 touch-target flex-shrink-0"
            title="Download CSV of current filter"
          >
            <Download className="w-4 h-4 text-slate-200" />
            <span>Export CSV ({filteredLeads.length})</span>
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Page Filter */}
          <div>
            <select
              value={selectedPageId}
              onChange={(e) => setSelectedPageId(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Pages</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Duplication & Drop Count Filter */}
          <div>
            <select
              value={selectedDuplication}
              onChange={(e) => setSelectedDuplication(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-purple-700 bg-purple-50/50"
            >
              <option value="all">All Drops</option>
              <option value="duplicates">Repeat Drops (&gt;1x)</option>
              <option value="crosspage">Cross-Page Drops</option>
              <option value="unique">Single Drops Only</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Keyword Filter */}
          <div>
            <select
              value={selectedKeyword}
              onChange={(e) => setSelectedKeyword(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Keywords</option>
              {uniqueKeywords.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Complete / Partial */}
          <div>
            <select
              value={selectedCompleteness}
              onChange={(e) => setSelectedCompleteness(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="all">All Submissions</option>
              <option value="complete">Complete Only</option>
              <option value="partial">Partial Dropoffs</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Content Area: Stacked Cards on Mobile & Full Table on Desktop */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">Loading leads...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading leads</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No leads found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {search || selectedPageId !== "all" || selectedSource !== "all" || selectedDuplication !== "all"
              ? "Try adjusting your filters or search keywords."
              : "Leads captured from live landing pages and quizzes will appear here in real-time."}
          </p>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (< 768px): Stacked Cards with Timeline Trigger & Delete */}
          <div className="md:hidden space-y-3">
            {filteredLeads.map((lead) => {
              const dropInfo = getLeadDropInfo(lead);
              return (
                <div
                  key={lead.id}
                  onClick={() => handleOpenLeadDetails(lead)}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 active:bg-slate-50 transition-colors cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center flex-shrink-0">
                        {lead.name ? lead.name.charAt(0).toUpperCase() : "?"}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {lead.name || "Anonymous Visitor"}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          {lead.email || "No email"}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                          {formatDateParts(lead.created_at).date} &bull; {formatDateParts(lead.created_at).time}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          lead.is_partial
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {lead.is_partial ? "Partial" : "Complete"}
                      </span>
                      {dropInfo.isDuplicate && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-0.5">
                          <RefreshCw className="w-2.5 h-2.5" />
                          <span>{dropInfo.dropCount}x drops</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Bar */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Phone
                      </span>
                      <span className="font-mono text-slate-700">
                        {lead.phone_e164 || "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Drop Count
                      </span>
                      <span className="font-bold text-slate-800">
                        {dropInfo.dropCount > 1
                          ? `${dropInfo.dropCount} times across ${dropInfo.pageCount} page(s)`
                          : "1st drop"}
                      </span>
                    </div>
                  </div>

                  {/* Footer with Source Medium, Program & Quick Contact + Delete */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                      <span className="font-semibold text-slate-700 truncate">
                        {cleanPageName(lead.page?.name || lead.quiz_result || "General Assessment")}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[9px] font-bold">
                        {lead.source || "direct"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {lead.phone_e164 && (
                        <a
                          href={`https://wa.me/${lead.phone_e164.replace('+', '')}?text=Hi%20${encodeURIComponent(
                            lead.name || ''
                          )},%20thank%20you%20for%20contacting%20TerraTern.`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenLeadDetails(lead)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-0.5"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeadToDelete(lead)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                        title="Delete lead"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 768px): Full Data Table (Format: Date & Time | Name | Email | Contact & Drops | Page | Source Medium | Action) */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/85 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-3.5 whitespace-nowrap">Date & Time</th>
                    <th className="py-3.5 px-3">Name</th>
                    <th className="py-3.5 px-3">Email</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Contact & Drops</th>
                    <th className="py-3.5 px-3">Page</th>
                    <th className="py-3.5 px-3 whitespace-nowrap">Source Medium</th>
                    <th className="py-3.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLeads.map((lead) => {
                    const rawSource = (lead.source || lead.utm?.utm_source || "direct").toLowerCase();
                    const mediumLabel =
                      rawSource === "ig_dm"
                        ? "Instagram DM"
                        : rawSource === "ig_bio"
                        ? "Instagram Bio"
                        : rawSource === "wa_chat" || rawSource === "whatsapp"
                        ? "WhatsApp"
                        : rawSource === "fb_ad"
                        ? "Facebook Ads"
                        : rawSource === "yt_bio"
                        ? "YouTube"
                        : rawSource.charAt(0).toUpperCase() + rawSource.slice(1);

                    const mediumBadgeClass =
                      rawSource.includes("ig")
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : rawSource.includes("wa")
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : rawSource.includes("fb")
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-700 border-slate-200";

                    const dateParts = formatDateParts(lead.created_at);
                    const displayName = cleanPageName(lead.page?.name || lead.quiz_result || "General Assessment");
                    const dropInfo = getLeadDropInfo(lead);

                    return (
                      <tr
                        key={lead.id}
                        onClick={() => handleOpenLeadDetails(lead)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        {/* 1. Date and below it Time */}
                        <td className="py-3.5 px-3.5 text-xs whitespace-nowrap font-medium">
                          <div className="font-bold text-slate-800">{dateParts.date}</div>
                          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>{dateParts.time}</span>
                          </div>
                        </td>

                        {/* 2. Name */}
                        <td className="py-3.5 px-3 font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          <div className="truncate max-w-[150px]">{lead.name || "Anonymous Lead"}</div>
                        </td>

                        {/* 3. Email */}
                        <td className="py-3.5 px-3 text-xs text-slate-600 font-mono">
                          <div className="truncate max-w-[180px]">{lead.email || "—"}</div>
                        </td>

                        {/* 4. Contact & Duplication Drops */}
                        <td className="py-3.5 px-3 text-xs whitespace-nowrap">
                          <div className="font-mono font-bold text-slate-800">{lead.phone_e164 || "—"}</div>
                          <div className="mt-1 flex items-center gap-1">
                            {dropInfo.isDuplicate ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200"
                                title={`This contact dropped ${dropInfo.dropCount} times across ${dropInfo.pageCount} page(s): ${dropInfo.pages.join(", ")}`}
                              >
                                <RefreshCw className="w-2.5 h-2.5 text-purple-600" />
                                <span>{dropInfo.dropCount} drops</span>
                                {dropInfo.pageCount > 1 && (
                                  <span className="opacity-75 font-normal">({dropInfo.pageCount} pages)</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">1st drop</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Page */}
                        <td className="py-3.5 px-3">
                          <div className="truncate max-w-[220px] font-bold text-slate-800 text-xs" title={lead.page?.name || displayName}>
                            {displayName}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {lead.page?.slug ? (
                              <a
                                href={`/p/${lead.page.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-mono text-blue-700 hover:text-blue-900 hover:underline"
                              >
                                <span>/{lead.page.slug}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-[11px]">/direct</span>
                            )}
                          </div>
                        </td>

                        {/* 6. Source Medium */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${mediumBadgeClass}`}>
                            {mediumLabel}
                          </span>
                          {lead.keyword && (
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                              kw: {lead.keyword}
                            </span>
                          )}
                        </td>

                        {/* 7. Action: Details + Delete */}
                        <td className="py-3.5 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenLeadDetails(lead);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#00215C] text-slate-700 hover:text-white font-bold text-xs transition shadow-2xs"
                              title="View full lead timeline & answers"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLeadToDelete(lead);
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition"
                              title="Delete lead permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 4. Lead Timeline & Details Modal */}
      {selectedLead && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLead(null)}
          title={selectedLead.name || "Lead Submission Details"}
          description={`Captured on ${formatDate(selectedLead.created_at)} via ${
            selectedLead.page?.name || "Lead Page"
          }`}
          maxWidth="xl"
        >
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Email Address
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedLead.email || "—"}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Phone (E.164 Format)
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedLead.phone_e164 || "—"}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Drop Frequency
                </span>
                <div className="font-bold text-purple-700">
                  {(() => {
                    const info = getLeadDropInfo(selectedLead);
                    return info.dropCount > 1
                      ? `${info.dropCount} drops across ${info.pageCount} page(s)`
                      : "Single initial drop";
                  })()}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Acquisition Attribution
                </span>
                <div className="text-slate-700">
                  Source: <strong>{selectedLead.source || "Direct"}</strong> &bull; Keyword:{" "}
                  <strong>{selectedLead.keyword || "None"}</strong>
                </div>
              </div>
            </div>

            {/* Cross-Page Drops Summary */}
            {(() => {
              const info = getLeadDropInfo(selectedLead);
              if (info.pages.length > 0) {
                return (
                  <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-xl text-xs space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 block">
                      Pages Dropped On ({info.pages.length})
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {info.pages.map((p, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white text-purple-900 border border-purple-200 rounded-md font-semibold text-[11px]">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Quick Contact Action Bar */}
            <div className="flex items-center gap-2">
              {selectedLead.phone_e164 && (
                <a
                  href={`https://wa.me/${selectedLead.phone_e164.replace('+', '')}?text=Hi%20${encodeURIComponent(
                    selectedLead.name || ''
                  )},%20thank%20you%20for%20contacting%20TerraTern%20regarding%20immigration%20pathways.`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                </a>
              )}
              {selectedLead.phone_e164 && (
                <a
                  href={`tel:${selectedLead.phone_e164}`}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </a>
              )}
              {selectedLead.email && (
                <a
                  href={`mailto:${selectedLead.email}?subject=TerraTern%20Immigration%20Assessment`}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>
              )}
            </div>

            {/* UTM Parameters */}
            {selectedLead.utm && Object.keys(selectedLead.utm).length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Campaign UTM Parameters
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-700 space-y-1">
                  {Object.entries(selectedLead.utm).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-slate-400">{key}:</span>
                      <span className="font-semibold text-slate-800">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Funnel Timeline */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Visitor Interaction Timeline</span>
              </h4>

              {loadingEvents ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600 mx-auto mb-1" />
                  Loading timeline events...
                </div>
              ) : leadEvents.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  No individual funnel events recorded for this session.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {leadEvents.map((evt, idx) => {
                    const eventBadges: Record<
                      string,
                      { label: string; color: string; icon: string }
                    > = {
                      view: { label: "Page View", color: "bg-slate-500 text-white", icon: "👁️" },
                      start: { label: "Funnel Started", color: "bg-blue-600 text-white", icon: "🚀" },
                      answer: { label: "Question Answered", color: "bg-indigo-600 text-white", icon: "⚡" },
                      submit: { label: "Lead Form Submitted", color: "bg-emerald-600 text-white", icon: "✅" },
                      download: { label: "PDF Downloaded", color: "bg-purple-600 text-white", icon: "📄" },
                      repeat: { label: "Repeat Visit", color: "bg-amber-600 text-white", icon: "🔄" },
                    };

                    const badge = eventBadges[evt.type] || {
                      label: evt.type,
                      color: "bg-slate-700 text-white",
                      icon: "•",
                    };

                    return (
                      <div key={evt.id || idx} className="relative group">
                        <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 group-hover:scale-125 transition-transform" />

                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{badge.icon}</span>
                              <span>{badge.label}</span>
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDate(evt.created_at)}
                            </span>
                          </div>

                          {evt.meta && Object.keys(evt.meta).length > 0 && (
                            <pre className="p-2 bg-slate-50 rounded text-[11px] font-mono text-slate-600 overflow-x-auto mt-1 border border-slate-100">
                              {JSON.stringify(evt.meta, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setLeadToDelete(selectedLead)}
                className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Lead</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors touch-target"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. Delete Lead Confirmation Modal */}
      {leadToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setLeadToDelete(null)}
          title="Delete Lead"
          description="Are you sure you want to delete this lead record? This action cannot be undone."
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-xl text-xs space-y-2">
              <p className="font-bold text-rose-800">
                You are about to delete:
              </p>
              <div className="space-y-1 font-mono text-slate-800">
                <div>Name: <strong>{leadToDelete.name || "Anonymous"}</strong></div>
                <div>Phone: <strong>{leadToDelete.phone_e164 || "—"}</strong></div>
                <div>Email: <strong>{leadToDelete.email || "—"}</strong></div>
                <div>Page: <strong>{leadToDelete.page?.name || "Direct"}</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLead}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
