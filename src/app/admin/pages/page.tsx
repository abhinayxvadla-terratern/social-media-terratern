"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Page, PageStatus, PageType, Asset, PageStat } from "@/lib/types";
import { useAdmin } from "@/contexts/AdminContext";
import { StatusBadge, PageTypeBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import {
  formatDate,
  formatPercentage,
  formatNumber,
  generateUniqueSlug,
  generatePageKey,
} from "@/lib/utils";
import {
  Plus,
  Search,
  Copy,
  Check,
  Edit2,
  CopyPlus,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  AlertCircle,
  RefreshCw,
  FileText,
  Calendar,
  Globe,
  Link as LinkIcon,
  FileCheck,
  Share2,
  Code2,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";

export default function PagesManagementPage() {
  const { userRole, canEdit, isOwner } = useAdmin();
  const supabase = createClient();

  const cachedPages = getCachedData<Page[]>("admin_pages");
  const [pages, setPages] = useState<Page[]>(() => cachedPages || []);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(() => !cachedPages);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Bulk Selection
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);

  // Modals & State
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<Page | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lead Capture / Integration Snippets Modal
  const [integrationModalPage, setIntegrationModalPage] = useState<Page | null>(null);
  const [integrationTab, setIntegrationTab] = useState<"script" | "webhook" | "curl">("script");

  // Social DM Link Modal
  const [socialModalPage, setSocialModalPage] = useState<Page | null>(null);
  const [socialPlatform, setSocialPlatform] = useState("ig_dm");
  const [socialKeyword, setSocialKeyword] = useState("");
  const [socialPostId, setSocialPostId] = useState("reel_101");
  const [copiedSocial, setCopiedSocial] = useState(false);

  // Fetch all pages and analytics stats
  const fetchPages = async () => {
    try {
      if (!cachedPages) setLoading(true);
      setError(null);

      // Fetch pages
      const { data: pagesData, error: pagesError } = await supabase
        .from("pages")
        .select("*, pdf_asset:assets(*)")
        .order("created_at", { ascending: false });

      if (pagesError) throw pagesError;

      // Fetch stats from page_stats view
      const { data: statsData } = await supabase
        .from("page_stats")
        .select("page_id, leads, conversion_percentage");

      const statsMap = new Map<string, { leads: number; conversion: number }>();
      if (statsData) {
        statsData.forEach((s: any) => {
          statsMap.set(s.page_id, {
            leads: Number(s.leads || 0),
            conversion: Number(s.conversion_percentage || 0),
          });
        });
      }

      // Merge stats
      const mergedPages = (pagesData || []).map((p: any) => {
        const stat = statsMap.get(p.id);
        return {
          ...p,
          leads_count: stat?.leads ?? 0,
          conversion_percentage: stat?.conversion ?? 0,
        };
      });

      setPages(mergedPages);
      setCachedData("admin_pages", mergedPages);

      // Also fetch assets for attachment selector
      const { data: assetsData } = await supabase
        .from("assets")
        .select("*")
        .order("name", { ascending: true });

      if (assetsData) setAssets(assetsData);
    } catch (err: any) {
      console.error("Error fetching pages:", err);
      setError(err.message || "Failed to load pages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // Filtered pages
  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      const matchesSearch =
        page.name.toLowerCase().includes(search.toLowerCase()) ||
        page.slug.toLowerCase().includes(search.toLowerCase()) ||
        (page.keyword && page.keyword.toLowerCase().includes(search.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ? true : page.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [pages, search, statusFilter]);

  const existingSlugs = useMemo(() => pages.map((p) => p.slug), [pages]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle Live/Unlive on row
  const handleToggleLive = async (page: Page) => {
    if (!canEdit) return;
    const nextStatus: PageStatus = page.status === "live" ? "paused" : "live";

    try {
      const { error } = await supabase
        .from("pages")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", page.id);

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: nextStatus } : p))
      );
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    }
  };

  // Duplicate a page
  const handleDuplicate = async (page: Page) => {
    if (!canEdit) return;
    try {
      const newSlug = generateUniqueSlug(`${page.slug}-copy`, existingSlugs);
      const newKey = generatePageKey();

      const newPagePayload = {
        name: `${page.name} (Copy)`,
        slug: newSlug,
        page_type: page.page_type,
        status: "draft" as PageStatus,
        keyword: page.keyword,
        page_url: page.page_url,
        closed_message: page.closed_message,
        closed_redirect_url: page.closed_redirect_url,
        pdf_asset_id: page.pdf_asset_id,
        page_key: newKey,
        allowed_origins: page.allowed_origins || [],
      };

      const { data, error } = await supabase
        .from("pages")
        .insert(newPagePayload)
        .select("*, pdf_asset:assets(*)")
        .single();

      if (error) throw error;

      setPages((prev) => [
        { ...data, leads_count: 0, conversion_percentage: 0 },
        ...prev,
      ]);
    } catch (err: any) {
      alert("Error duplicating page: " + err.message);
    }
  };

  // Delete page
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPage || !canEdit) return;
    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", deleteConfirmPage.id);

      if (error) throw error;

      setPages((prev) => prev.filter((p) => p.id !== deleteConfirmPage.id));
      setDeleteConfirmPage(null);
    } catch (err: any) {
      alert("Error deleting page: " + err.message);
    }
  };

  // Save edited page
  const handleSaveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPage || !canEdit) return;
    setIsSaving(true);

    try {
      const updatePayload = {
        name: editingPage.name,
        slug: editingPage.slug,
        page_type: editingPage.page_type,
        status: editingPage.status,
        start_at: editingPage.start_at || null,
        end_at: editingPage.end_at || null,
        keyword: editingPage.keyword || null,
        page_url: editingPage.page_url || null,
        closed_message: editingPage.closed_message || null,
        closed_redirect_url: editingPage.closed_redirect_url || null,
        pdf_asset_id: editingPage.pdf_asset_id || null,
        allowed_origins: editingPage.allowed_origins || [],
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("pages")
        .update(updatePayload)
        .eq("id", editingPage.id)
        .select("*, pdf_asset:assets(*)")
        .single();

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) =>
          p.id === editingPage.id
            ? { ...data, leads_count: p.leads_count, conversion_percentage: p.conversion_percentage }
            : p
        )
      );

      setEditingPage(null);
    } catch (err: any) {
      alert("Error updating page: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk Selection Handlers
  const toggleSelectAll = () => {
    if (selectedPageIds.length === filteredPages.length) {
      setSelectedPageIds([]);
    } else {
      setSelectedPageIds(filteredPages.map((p) => p.id));
    }
  };

  const toggleSelectPage = (id: string) => {
    setSelectedPageIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleBulkUpdateStatus = async (newStatus: PageStatus) => {
    if (selectedPageIds.length === 0 || !canEdit) return;
    setIsBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("pages")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .in("id", selectedPageIds);

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) =>
          selectedPageIds.includes(p.id) ? { ...p, status: newStatus } : p
        )
      );
      setSelectedPageIds([]);
    } catch (err: any) {
      alert("Error updating pages: " + err.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPageIds.length === 0 || !canEdit) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedPageIds.length} selected page(s)? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsBulkActionLoading(true);
    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .in("id", selectedPageIds);

      if (error) throw error;

      setPages((prev) => prev.filter((p) => !selectedPageIds.includes(p.id)));
      setSelectedPageIds([]);
    } catch (err: any) {
      alert("Error deleting pages: " + err.message);
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* 2. Key Numbers on Top (Phone-first metric tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Pages
          </span>
          <span className="text-2xl font-black text-slate-900">
            {formatNumber(pages.length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Live Pages
          </span>
          <span className="text-2xl font-black text-emerald-600">
            {formatNumber(pages.filter((p) => p.status === "live").length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
            Drafts
          </span>
          <span className="text-2xl font-black text-slate-700">
            {formatNumber(pages.filter((p) => p.status === "draft").length)}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            Total Leads
          </span>
          <span className="text-2xl font-black text-blue-600">
            {formatNumber(
              pages.reduce((acc, p) => acc + (p.leads_count || 0), 0)
            )}
          </span>
        </div>
      </div>

      {/* 3. Actions & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Status Filter */}
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name, slug or keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="live">Live</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </div>

        {/* Action Button: Build Page */}
        {canEdit && (
          <div className="flex items-center gap-2">
            <a
              href="/admin/pages/build"
              className="px-4 py-2.5 bg-[#00215C] hover:bg-[#255CC1] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#F1C819]" />
              <span>Build Page</span>
            </a>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar (Shown when 1 or more pages selected) */}
      {selectedPageIds.length > 0 && (
        <div className="bg-[#00215C] text-white px-4 py-3 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg">
              {selectedPageIds.length} Selected
            </span>
            <span className="text-xs text-slate-200 hidden sm:inline">
              Apply bulk action across all selected pages:
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkUpdateStatus("live")}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Make Live</span>
            </button>

            <button
              onClick={() => handleBulkUpdateStatus("paused")}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition shadow-xs"
            >
              <span>Pause / Unlive</span>
            </button>

            <button
              onClick={handleBulkDelete}
              disabled={isBulkActionLoading}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedPageIds([])}
              className="px-2.5 py-1.5 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* 4. Content Area: Stacked Cards on Mobile (360px) & Full Table on Desktop (768px+) */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">Loading pages...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error loading pages</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No pages found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            {search || statusFilter !== "all"
              ? "Try adjusting your search criteria or filter."
              : "Build your first landing page or points assessment to begin collecting leads."}
          </p>
          {canEdit && (
            <div className="flex items-center justify-center">
              <a
                href="/admin/pages/build"
                className="px-4 py-2.5 bg-[#00215C] hover:bg-[#255CC1] text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 touch-target"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F1C819]" />
                <span>Build First Page</span>
              </a>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (< 768px): Stacked Cards with 44px Tap Targets */}
          <div className="md:hidden space-y-3">
            {filteredPages.map((page) => {
              const isLive = page.status === "live";

              return (
                <div
                  key={page.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  {/* Top: Checkbox, Name, Status & Live Toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedPageIds.includes(page.id)}
                        onChange={() => toggleSelectPage(page.id)}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-[#00215C] focus:ring-[#255CC1]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <PageTypeBadge type={page.page_type} />
                          <StatusBadge status={page.status} />
                        </div>
                        <h3 className="font-bold text-base text-slate-900 leading-snug break-words">
                          {page.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-blue-700 font-mono">
                            /{page.slug}
                          </code>
                          <button
                            onClick={() => handleCopy(page.slug, `slug-${page.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700"
                            title="Copy slug"
                          >
                            {copiedId === `slug-${page.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live/Unlive Instant Toggle (Minimum 44px touch target) */}
                    {canEdit ? (
                      <button
                        onClick={() => handleToggleLive(page)}
                        className={`touch-target px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                          isLive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                        }`}
                        title={isLive ? "Click to Pause" : "Click to Make Live"}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <span>{isLive ? "LIVE" : "UNLIVE"}</span>
                      </button>
                    ) : (
                      <StatusBadge status={page.status} />
                    )}
                  </div>

                  {/* Middle: Metrics Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Leads
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {formatNumber(page.leads_count)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Conversion %
                      </span>
                      <span className="text-sm font-black text-blue-600">
                        {formatPercentage(page.conversion_percentage)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(page.page_key, `key-${page.id}`)}
                        className="touch-target px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-1"
                      >
                        {copiedId === `key-${page.id}` ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>Key</span>
                      </button>

                      <a
                        href={page.page_url || `/p/${page.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="touch-target p-2 text-slate-500 hover:text-blue-600"
                        title="Open Live Assessment"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setSocialModalPage(page);
                          setSocialKeyword(page.keyword || "");
                        }}
                        className="touch-target p-2 text-slate-500 hover:text-[#255CC1]"
                        title="ManyChat / Social DM Link"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setIntegrationModalPage(page)}
                        className="touch-target p-2 text-slate-500 hover:text-indigo-600"
                        title="Lead Capture Setup (Embed / Webhook)"
                      >
                        <Code2 className="w-4 h-4" />
                      </button>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicate(page)}
                          className="touch-target p-2 text-slate-500 hover:text-slate-800"
                          title="Duplicate Page"
                        >
                          <CopyPlus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingPage(page)}
                          className="touch-target p-2 text-blue-600 hover:text-blue-800"
                          title="Edit Page"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmPage(page)}
                          className="touch-target p-2 text-rose-500 hover:text-rose-700"
                          title="Delete Page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 768px): Full Data Table */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all pages"
                        checked={
                          filteredPages.length > 0 &&
                          selectedPageIds.length === filteredPages.length
                        }
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-[#00215C] focus:ring-[#255CC1]"
                      />
                    </th>
                    <th className="py-3 px-4">Page Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Status & Live Toggle</th>
                    <th className="py-3 px-4 text-right">Leads</th>
                    <th className="py-3 px-4 text-right">Conversion</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPages.map((page) => {
                    const isLive = page.status === "live";

                    return (
                      <tr
                        key={page.id}
                        className={`hover:bg-slate-50/60 transition-colors group ${
                          selectedPageIds.includes(page.id) ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select page ${page.name}`}
                            checked={selectedPageIds.includes(page.id)}
                            onChange={() => toggleSelectPage(page.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#00215C] focus:ring-[#255CC1]"
                          />
                        </td>

                        {/* Page Details */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {page.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs mt-0.5">
                            <span className="font-mono text-slate-500">/{page.slug}</span>
                            <button
                              onClick={() => handleCopy(page.slug, `slug-${page.id}`)}
                              className="text-slate-400 hover:text-slate-700"
                              title="Copy slug"
                            >
                              {copiedId === `slug-${page.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={page.page_url || `/p/${page.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600 ml-1"
                              title="Open Live Assessment"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        {/* Page Type */}
                        <td className="py-3.5 px-4">
                          <PageTypeBadge type={page.page_type} />
                        </td>

                        {/* Status & Live Toggle */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <StatusBadge status={page.status} />
                            <button
                              type="button"
                              onClick={() => {
                                setSocialModalPage(page);
                                setSocialKeyword(page.keyword || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#255CC1] hover:bg-blue-50 rounded transition-colors"
                              title="Generate ManyChat / Social DM Link"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setIntegrationModalPage(page)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Lead Capture Setup (Embed / Webhook)"
                            >
                              <Code2 className="w-4 h-4" />
                            </button>

                            {canEdit && (
                              <button
                                onClick={() => handleToggleLive(page)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isLive
                                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                                }`}
                                title={isLive ? "Click to Pause" : "Click to Make Live"}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                  }`}
                                />
                                <span>{isLive ? "Live" : "Unlive"}</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Leads */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-800">
                          {formatNumber(page.leads_count)}
                        </td>

                        {/* Conversion % */}
                        <td className="py-3.5 px-4 text-right font-black text-blue-600">
                          {formatPercentage(page.conversion_percentage)}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleCopy(page.page_key, `key-${page.id}`)}
                              className="px-2 py-1 text-xs font-mono font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1"
                              title="Copy Page Key"
                            >
                              {copiedId === `key-${page.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                              <span>Key</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSocialModalPage(page);
                                setSocialKeyword(page.keyword || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-[#255CC1] hover:bg-blue-50 rounded transition-colors"
                              title="Generate ManyChat / Social DM Link"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setIntegrationModalPage(page)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              title="Lead Capture Setup (Embed / Webhook)"
                            >
                              <Code2 className="w-4 h-4" />
                            </button>

                            {canEdit && (
                              <>
                                <button
                                  onClick={() => handleDuplicate(page)}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                  title="Duplicate page"
                                >
                                  <CopyPlus className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingPage(page)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="Edit page"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmPage(page)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete page"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
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

      {/* 5. Edit Page Modal */}
      {editingPage && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPage(null)}
          title="Edit Page Configuration"
          description="Update page metadata, schedule dates, redirects, or connected assets."
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Page Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingPage.name}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Slug (Unique Path) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingPage.slug}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Page Type
                </label>
                <select
                  value={editingPage.page_type}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      page_type: e.target.value as PageType,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="quiz">Interactive Quiz</option>
                  <option value="lead_pdf">Lead PDF</option>
                  <option value="welcome">Welcome Page</option>
                  <option value="other">Other Landing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Status
                </label>
                <select
                  value={editingPage.status}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      status: e.target.value as PageStatus,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="live">Live</option>
                  <option value="paused">Paused</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Keyword
                </label>
                <input
                  type="text"
                  placeholder="e.g. visa points"
                  value={editingPage.keyword || ""}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, keyword: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Schedule Dates */}
            {editingPage.status === "scheduled" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingPage.start_at
                        ? new Date(editingPage.start_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        start_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingPage.end_at
                        ? new Date(editingPage.end_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        end_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}

            {/* URLs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Page Web Address (URL)
                </label>
                <input
                  type="text"
                  placeholder="https://terratern.com/quiz/example"
                  value={editingPage.page_url || ""}
                  onChange={(e) =>
                    setEditingPage({ ...editingPage, page_url: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Redirect Link (When Closed)
                </label>
                <input
                  type="text"
                  placeholder="https://terratern.com/closed"
                  value={editingPage.closed_redirect_url || ""}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      closed_redirect_url: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Closed Message
              </label>
              <textarea
                rows={2}
                placeholder="This assessment is currently closed. Please check back later."
                value={editingPage.closed_message || ""}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    closed_message: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
            </div>

            {/* PDF Attachment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Attached PDF Asset (Lead Magnet)
              </label>
              <select
                value={editingPage.pdf_asset_id || ""}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    pdf_asset_id: e.target.value || null,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              >
                <option value="">No PDF attached</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    📄 {asset.name} ({asset.storage_path})
                  </option>
                ))}
              </select>
            </div>

            {/* Allowed Origins */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Allowed Embedding Origins (One per line)
              </label>
              <textarea
                rows={2}
                placeholder="https://terratern.com&#10;http://localhost:3000"
                value={(editingPage.allowed_origins || []).join("\n")}
                onChange={(e) =>
                  setEditingPage({
                    ...editingPage,
                    allowed_origins: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>

            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                disabled={isSaving}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors touch-target"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 touch-target"
              >
                {isSaving && <span className="animate-spin">⏳</span>}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* 7. Confirm Delete Modal */}
      {/* 8. ManyChat / Social DM Tracking Link Modal */}
      {socialModalPage && (
        <Modal
          isOpen={true}
          onClose={() => setSocialModalPage(null)}
          title="Social DM / ManyChat Campaign Link"
          description={`Generate a tracked link for "${socialModalPage.name}" with auto-tagging for leads.`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Social Channel
                </label>
                <select
                  value={socialPlatform}
                  onChange={(e) => setSocialPlatform(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:outline-none focus:border-[#255CC1]"
                >
                  <option value="ig_dm">Instagram DM (ManyChat)</option>
                  <option value="ig_bio">Instagram Bio</option>
                  <option value="ig_story">Instagram Story</option>
                  <option value="linkedin">LinkedIn Post</option>
                  <option value="youtube">YouTube Shorts</option>
                  <option value="wa_broadcast">WhatsApp Broadcast</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Trigger Keyword (CTA)
                </label>
                <input
                  type="text"
                  value={socialKeyword}
                  onChange={(e) => setSocialKeyword(e.target.value)}
                  placeholder="e.g. GERMANY"
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 font-bold uppercase focus:outline-none focus:border-[#255CC1]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Post / Reel Identifier
              </label>
              <input
                type="text"
                value={socialPostId}
                onChange={(e) => setSocialPostId(e.target.value)}
                placeholder="e.g. reel_march_10"
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:outline-none focus:border-[#255CC1]"
              />
            </div>

            {/* Generated URL */}
            <div className="pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                Ready-to-Paste ManyChat URL
              </label>
              {(() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const url = `${origin}/p/${socialModalPage.slug}?src=${socialPlatform}&kw=${encodeURIComponent(
                  socialKeyword || 'GENERAL'
                )}&post_id=${encodeURIComponent(socialPostId || 'post_1')}`;
                return (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={url}
                      className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono select-all focus:outline-none text-[#00215C]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        setCopiedSocial(true);
                        setTimeout(() => setCopiedSocial(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl bg-[#00215C] text-white text-xs font-bold hover:bg-[#255CC1] transition flex items-center gap-1.5 shadow-xs"
                    >
                      {copiedSocial ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSocialModalPage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* 5. Lead Capture & External Integration Setup Modal */}
      {integrationModalPage && (
        <Modal
          isOpen={!!integrationModalPage}
          onClose={() => setIntegrationModalPage(null)}
          title={`Lead Capture Setup: ${integrationModalPage.name}`}
          description="How to connect this page and capture leads from external websites, ManyChat, or webhooks."
          maxWidth="lg"
        >
          {(() => {
            const origin = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';
            const pageKey = integrationModalPage.page_key;

            const scriptSnippet = `<!-- 1. Add this script tag inside your <head> or before </body> -->
<script
  src="${origin}/connect.js"
  data-page-key="${pageKey}"
  async
></script>

<!-- 2. Use your existing form or add this standard form -->
<form id="terrateern-lead-form">
  <input type="tel" name="phone" placeholder="Mobile Number (+91)" required />
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="checkbox" name="consent" checked required />
  <button type="submit">Submit Assessment</button>
</form>`;

            const webhookPayload = JSON.stringify(
              {
                page_key: pageKey,
                phone: "{{phone}}",
                name: "{{name}}",
                email: "{{email}}",
                source: "ig_dm",
                keyword: integrationModalPage.keyword || "GERMANY",
                consent: true,
              },
              null,
              2
            );

            const curlSnippet = `curl -X POST ${origin}/api/v1/leads \\
  -H "Content-Type: application/json" \\
  -d '{
    "page_key": "${pageKey}",
    "phone": "+919876543210",
    "name": "Applicant Name",
    "email": "applicant@gmail.com",
    "source": "ig_dm",
    "keyword": "${integrationModalPage.keyword || 'GERMANY'}",
    "consent": true
  }'`;

            return (
              <div className="space-y-4">
                {/* Method Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIntegrationTab("script")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      integrationTab === "script"
                        ? "bg-white text-[#00215C] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    1-Line Embed Script (Webflow / WP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationTab("webhook")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      integrationTab === "webhook"
                        ? "bg-white text-[#00215C] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    ManyChat / Webhook
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationTab("curl")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      integrationTab === "curl"
                        ? "bg-white text-[#00215C] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    REST API (cURL)
                  </button>
                </div>

                {/* Tab 1: Script Embed */}
                {integrationTab === "script" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Embed this lightweight connector on your external website (WordPress, Webflow, Framer, Wix, or custom HTML). It automatically captures lead inputs, normalizes phone numbers, blocks disposable emails, and tracks UTM tags.
                    </p>
                    <div className="relative">
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre">
                        {scriptSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy(scriptSnippet, "embed-code")}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        {copiedId === "embed-code" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Code</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Webhook */}
                {integrationTab === "webhook" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Use in <strong>ManyChat</strong> (External Request), <strong>Zapier</strong>, or <strong>Make</strong> to create leads whenever a follower DMs a trigger keyword.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                          Webhook URL (POST)
                        </span>
                        <div className="flex items-center justify-between font-mono font-semibold text-[#00215C]">
                          <span className="truncate">{origin}/api/v1/leads</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(`${origin}/api/v1/leads`, "webhook-url")}
                            className="p-1 hover:text-[#255CC1]"
                            title="Copy URL"
                          >
                            {copiedId === "webhook-url" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          JSON Body Payload
                        </span>
                        <div className="relative">
                          <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre">
                            {webhookPayload}
                          </pre>
                          <button
                            type="button"
                            onClick={() => handleCopy(webhookPayload, "webhook-payload")}
                            className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                          >
                            {copiedId === "webhook-payload" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>Copy Payload</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: cURL */}
                {integrationTab === "curl" && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Send leads directly via HTTP POST from any backend service or mobile app.
                    </p>
                    <div className="relative">
                      <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre">
                        {curlSnippet}
                      </pre>
                      <button
                        type="button"
                        onClick={() => handleCopy(curlSnippet, "curl-snippet")}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                      >
                        {copiedId === "curl-snippet" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy cURL</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 font-mono">
                    Page Key: <span className="font-bold text-slate-800">{pageKey}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIntegrationModalPage(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
