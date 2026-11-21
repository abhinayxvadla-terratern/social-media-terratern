"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Page, PageStatus, PageType, Asset, PageStat, Lead } from "@/lib/types";
import { useAdmin } from "@/contexts/AdminContext";
import { StatusBadge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { FRONTEND_HUB_PAGE } from "@/lib/public-directory";
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
  Link2,
  Eye,
  EyeOff,
  Star,
  Flame,
  MessageSquare,
  Upload,
  BarChart2,
  TrendingUp,
  Users,
  Download,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { getCachedData, setCachedData } from "@/lib/client-cache";
import { cleanPageName } from "@/lib/vibe-engine";
import { ConnectPageModal } from "@/components/ui/ConnectPageModal";
import { TestimonialsManagementModal } from "@/components/ui/TestimonialsManagementModal";
import { SEED_TESTIMONIALS } from "@/lib/public-directory";

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
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [testimonialsModalOpen, setTestimonialsModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<Page | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Lead Capture / Integration Snippets Modal
  const [integrationModalPage, setIntegrationModalPage] = useState<Page | null>(null);
  const [integrationTab, setIntegrationTab] = useState<"live" | "script" | "webhook" | "curl">("live");

  // Custom Campaign UTM Builder feature state
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [copiedUtmLink, setCopiedUtmLink] = useState(false);

  const getCustomCampaignUrl = (baseSlug: string) => {
    let rawBase = `${origin}/p/${baseSlug}`;
    if (integrationModalPage?.page_url && integrationModalPage.page_url.startsWith("http")) {
      rawBase = integrationModalPage.page_url;
    }

    try {
      const urlObj = new URL(rawBase);
      if (utmSource.trim()) urlObj.searchParams.set("utm_source", utmSource.trim().toLowerCase());
      if (utmMedium.trim()) urlObj.searchParams.set("utm_medium", utmMedium.trim().toLowerCase());
      if (utmCampaign.trim()) urlObj.searchParams.set("utm_campaign", utmCampaign.trim().toLowerCase());
      if (utmTerm.trim()) urlObj.searchParams.set("utm_term", utmTerm.trim());
      if (utmContent.trim()) urlObj.searchParams.set("utm_content", utmContent.trim());
      return urlObj.toString();
    } catch {
      const params = new URLSearchParams();
      if (utmSource.trim()) params.set("utm_source", utmSource.trim().toLowerCase());
      if (utmMedium.trim()) params.set("utm_medium", utmMedium.trim().toLowerCase());
      if (utmCampaign.trim()) params.set("utm_campaign", utmCampaign.trim().toLowerCase());
      if (utmTerm.trim()) params.set("utm_term", utmTerm.trim());
      if (utmContent.trim()) params.set("utm_content", utmContent.trim());

      const qs = params.toString();
      return qs ? `${rawBase}${rawBase.includes("?") ? "&" : "?"}${qs}` : rawBase;
    }
  };

  const handleResetUtm = () => {
    setUtmSource("");
    setUtmMedium("");
    setUtmCampaign("");
    setUtmTerm("");
    setUtmContent("");
  };

  // Dedicated Page & Form Analytics Modal State
  const [analyticsModalPage, setAnalyticsModalPage] = useState<Page | null>(null);
  const [analyticsLeads, setAnalyticsLeads] = useState<Lead[]>([]);
  const [isLoadingAnalyticsLeads, setIsLoadingAnalyticsLeads] = useState(false);
  const [analyticsFormFilter, setAnalyticsFormFilter] = useState<string>("all");
  const [analyticsSearch, setAnalyticsSearch] = useState<string>("");
  const [editingPageLeads, setEditingPageLeads] = useState<Lead[]>([]);

  // Fetch leads for editing page (form-level analytics breakdown inside edit modal)
  useEffect(() => {
    if (!editingPage) {
      setEditingPageLeads([]);
      return;
    }
    const fetchEditLeads = async () => {
      try {
        const { data } = await supabase
          .from("leads")
          .select("*")
          .eq("page_id", editingPage.id)
          .order("created_at", { ascending: false });
        if (data) setEditingPageLeads(data as Lead[]);
      } catch (err) {
        console.error("Error loading leads for editing page:", err);
      }
    };
    fetchEditLeads();
  }, [editingPage]);

  // Export Leads to CSV Helper
  const exportLeadsToCsv = (leadsToExport: Lead[], pageTitle: string) => {
    if (!leadsToExport.length) return;
    const headers = ["ID", "Name", "Email", "Phone", "Form Type", "Country", "Created At"];
    const rows = leadsToExport.map((l) => [
      l.id,
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.email || "").replace(/"/g, '""')}"`,
      `"${(l.phone_e164 || "").replace(/"/g, '""')}"`,
      `"${(l.utm?.form_type || l.source || "form").replace(/"/g, '""')}"`,
      `"${((l.utm?.country_interested as string) || l.country_code || "").replace(/"/g, '""')}"`,
      `"${new Date(l.created_at).toISOString()}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${pageTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch leads for analytics modal
  useEffect(() => {
    if (!analyticsModalPage) {
      setAnalyticsLeads([]);
      return;
    }
    const fetchPageLeads = async () => {
      setIsLoadingAnalyticsLeads(true);
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .eq("page_id", analyticsModalPage.id)
          .order("created_at", { ascending: false });
        if (!error && data) {
          setAnalyticsLeads(data as Lead[]);
        }
      } catch (err) {
        console.error("Error loading leads for analytics:", err);
      } finally {
        setIsLoadingAnalyticsLeads(false);
      }
    };
    fetchPageLeads();
  }, [analyticsModalPage]);

  // Lead Form Categorization Helper
  const getLeadFormCategory = (lead: Lead) => {
    const formType = (lead.utm?.form_type || "").toLowerCase();
    const source = (lead.source || "").toLowerCase();

    if (formType.includes("consult") || source.includes("consult") || source === "website_hub") {
      return {
        formKey: "consultation",
        formTitle: "1:1 Consultation Form",
        icon: "📞",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200",
      };
    }
    if (lead.quiz_score !== null || lead.quiz_result !== null || formType.includes("assessment") || formType.includes("calc")) {
      return {
        formKey: "calculator",
        formTitle: "Calculator Assessment Form",
        icon: "🧮",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200",
      };
    }
    if (formType.includes("pdf") || source.includes("download") || source.includes("pdf")) {
      return {
        formKey: "pdf",
        formTitle: "PDF Guide Download Form",
        icon: "📄",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
      };
    }
    return {
      formKey: "quick",
      formTitle: "Quick Callback Form",
      icon: "💬",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  };

  // Fetch all pages and analytics stats
  const fetchPages = async () => {
    try {
      if (!cachedPages) setLoading(true);
      setError(null);

      // Fetch pages, page_stats, and leads counts in parallel for optimal speed
      const [pagesRes, statsRes, leadCountsRes] = await Promise.all([
        supabase
          .from("pages")
          .select("*, pdf_asset:assets(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("page_stats")
          .select("page_id, views, starts, leads, conversion_percentage"),
        supabase
          .from("leads")
          .select("page_id"),
      ]);

      if (pagesRes.error) throw pagesRes.error;
      const pagesData = pagesRes.data;
      const statsData = statsRes.data;
      const leadCountsData = leadCountsRes.data;

      const directLeadMap = new Map<string, number>();
      if (leadCountsData) {
        leadCountsData.forEach((l: any) => {
          if (l.page_id) {
            directLeadMap.set(l.page_id, (directLeadMap.get(l.page_id) || 0) + 1);
          }
        });
      }

      const statsMap = new Map<string, { views: number; starts: number; leads: number; conversion: number }>();
      if (statsData) {
        statsData.forEach((s: any) => {
          statsMap.set(s.page_id, {
            views: Number(s.views || 0),
            starts: Number(s.starts || 0),
            leads: Number(s.leads || 0),
            conversion: Number(s.conversion_percentage || 0),
          });
        });
      }

      // Merge stats
      const mergedPages = (pagesData || []).map((p: any) => {
        const stat = statsMap.get(p.id);
        const directCount = directLeadMap.get(p.id) || 0;
        const finalLeads = Math.max(stat?.leads ?? 0, directCount);
        const manualViews = p.config?.views_count ?? p.config?.manual_views;
        const finalViews = manualViews !== undefined && manualViews !== "" && !isNaN(Number(manualViews))
          ? Number(manualViews)
          : Math.max(stat?.views ?? 0, finalLeads);
        return {
          ...p,
          views_count: finalViews,
          leads_count: finalLeads,
          conversion_percentage: stat?.conversion ?? (finalViews > 0 ? Number(((finalLeads / finalViews) * 100).toFixed(1)) : (finalLeads > 0 ? 100 : 0)),
        };
      });

      // Fetch live Web Page traffic & form clicks from dedicated traffic endpoint (real-time, counting from now onwards)
      let liveWebTraffic = { views: 0, form_clicks: 0 };
      try {
        const trafficRes = await fetch("/api/v1/traffic");
        if (trafficRes.ok) {
          const tJson = await trafficRes.json();
          if (tJson?.data) {
            liveWebTraffic = {
              views: Number(tJson.data.views || 0),
              form_clicks: Number(tJson.data.form_clicks || 0),
            };
          }
        }
      } catch {}

      // Include Web Page (/) as a prominent first-class page in the pages table with verified real-time traffic
      const hubStat = statsMap.get("page_frontend_hub") || statsMap.get("public_hub");
      const frontendHubLeads = directLeadMap.get("page_frontend_hub") || directLeadMap.get("public_hub") || (hubStat?.leads ?? 0);

      // Clear any legacy benchmark numbers (2450, 2451) in admin browser cache
      if (typeof window !== "undefined") {
        const legacyTraffic = localStorage.getItem("tt_hub_traffic");
        if (legacyTraffic === "2450" || legacyTraffic === "2451") {
          localStorage.removeItem("tt_hub_traffic");
        }
        const legacyManual = localStorage.getItem("tt_hub_manual_views");
        if (legacyManual === "2450" || legacyManual === "2451") {
          localStorage.removeItem("tt_hub_manual_views");
        }
      }

      const storedHubViews = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_traffic") || 0) : 0;
      const storedHubClicks = typeof window !== "undefined" ? Number(localStorage.getItem("tt_hub_form_clicks") || 0) : 0;
      const manualHubViews = typeof window !== "undefined" ? localStorage.getItem("tt_hub_manual_views") : null;

      // Real-time Web Page Traffic: Use manual views override if admin set one, otherwise live verified traffic from now onwards
      const frontendViews = manualHubViews !== null && manualHubViews !== "" && !isNaN(Number(manualHubViews))
        ? Number(manualHubViews)
        : Math.max(hubStat?.views ?? 0, liveWebTraffic.views, storedHubViews, 0);

      // Qualified Form Intent Traffic: ONLY users who clicked the form buttons on the web page
      const hubFormClicks = Math.max(hubStat?.starts ?? 0, liveWebTraffic.form_clicks, storedHubClicks, frontendHubLeads);

      // Web Page Conversion: Strictly calculated as (Leads / Form Button Clicks), excluding passive page views
      const frontendConversion = hubFormClicks > 0
        ? Number(((frontendHubLeads / hubFormClicks) * 100).toFixed(1))
        : (frontendHubLeads > 0 ? 100 : 0);

      const hubPageMerged: Page = {
        ...FRONTEND_HUB_PAGE,
        name: "Web Page",
        slug: "",
        leads_count: frontendHubLeads,
        views_count: frontendViews,
        conversion_percentage: frontendConversion,
        config: {
          ...(FRONTEND_HUB_PAGE.config || {}),
          views_count: manualHubViews !== null && manualHubViews !== "" && !isNaN(Number(manualHubViews)) ? Number(manualHubViews) : frontendViews,
          form_clicks: hubFormClicks,
        },
      };

      const otherPages = mergedPages.filter(
        (p: any) => p.slug !== "" && p.slug !== "public-hub" && p.page_key !== "public_hub" && p.id !== "page_frontend_hub"
      );
      const allPagesList = [hubPageMerged, ...otherPages];

      setPages(allPagesList);
      setCachedData("admin_pages", allPagesList);

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

  const handleConnectPageSave = async (newPagePayload: Partial<Page>): Promise<Page> => {
    const { data, error } = await supabase
      .from("pages")
      .insert(newPagePayload)
      .select("*, pdf_asset:assets(*)")
      .single();

    if (error) throw error;

    const pageWithCounts: Page = {
      ...data,
      leads_count: 0,
      views_count: 0,
      conversion_percentage: 0,
    };

    setPages((prev) => [pageWithCounts, ...prev]);
    return pageWithCounts;
  };

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

  // Toggle Public Webpage visibility on row
  const handleToggleHubVisibility = async (page: Page) => {
    if (!canEdit) return;
    const isCurrentlyLiveOnWebpage = page.status === "live" && page.config?.show_in_directory !== false;
    const nextShow = !isCurrentlyLiveOnWebpage;
    const nextStatus = nextShow && page.status !== "live" ? "live" : page.status;
    const newConfig = { ...(page.config || {}), show_in_directory: nextShow };

    try {
      const updatePayload: any = { config: newConfig, updated_at: new Date().toISOString() };
      if (nextShow && page.status !== "live") {
        updatePayload.status = "live";
      }

      const { error } = await supabase
        .from("pages")
        .update(updatePayload)
        .eq("id", page.id);

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: nextStatus, config: newConfig } : p))
      );
    } catch (err: any) {
      alert("Error updating webpage visibility: " + err.message);
    }
  };

  // Toggle Featured Spotlight state on row
  const handleToggleFeatured = async (page: Page) => {
    if (!canEdit) return;
    const currentFeatured = Boolean(page.config?.is_featured);
    const nextFeatured = !currentFeatured;
    const newConfig = { ...(page.config || {}), is_featured: nextFeatured };

    try {
      const { error } = await supabase
        .from("pages")
        .update({ config: newConfig, updated_at: new Date().toISOString() })
        .eq("id", page.id);

      if (error) throw error;

      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, config: newConfig } : p))
      );
    } catch (err: any) {
      alert("Error updating spotlight: " + err.message);
    }
  };

  // Push / Toggle Hero Spotlight Calculator on Public Hub
  const handleToggleHero = async (page: Page) => {
    if (!canEdit) return;
    const isCurrentlyHero = Boolean(page.config?.is_hero_trending);
    const nextHero = !isCurrentlyHero;

    try {
      // 1. If enabling hero, unset other pages so only 1 calculator is the featured hero card
      if (nextHero) {
        const otherHeroPages = pages.filter((p) => p.id !== page.id && p.config?.is_hero_trending);
        for (const op of otherHeroPages) {
          await supabase
            .from("pages")
            .update({
              config: { ...(op.config || {}), is_hero_trending: false },
              updated_at: new Date().toISOString(),
            })
            .eq("id", op.id);
        }
      }

      const newConfig = {
        ...(page.config || {}),
        is_hero_trending: nextHero,
        hero_badge: page.config?.hero_badge || "🔥 HIGH DEMAND",
      };

      const { error } = await supabase
        .from("pages")
        .update({ config: newConfig, updated_at: new Date().toISOString() })
        .eq("id", page.id);

      if (error) throw error;

      const nextPages = pages.map((p) => {
        if (p.id === page.id) return { ...p, config: newConfig };
        if (nextHero && p.config?.is_hero_trending) {
          return { ...p, config: { ...(p.config || {}), is_hero_trending: false } };
        }
        return p;
      });

      setPages(nextPages);
      setCachedData("admin_pages", nextPages);
    } catch (err: any) {
      alert("Error updating hero calculator: " + err.message);
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

  // Delete page (Owner only)
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPage || !isOwner) return;
    try {
      const { error } = await supabase
        .from("pages")
        .delete()
        .eq("id", deleteConfirmPage.id);

      if (error) throw error;

      setPages((prev) => {
        const next = prev.filter((p) => p.id !== deleteConfirmPage.id);
        setCachedData("admin_pages", next);
        return next;
      });
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
      const manualViews =
        editingPage.config?.views_count !== undefined &&
        editingPage.config?.views_count !== "" &&
        !isNaN(Number(editingPage.config.views_count))
          ? Number(editingPage.config.views_count)
          : editingPage.views_count;

      const updatedConfig = {
        ...(editingPage.config || {}),
        views_count: manualViews,
      };

      // Special handler for Web Page (/)
      if (editingPage.id === "page_frontend_hub" || editingPage.slug === "" || editingPage.page_key === "public_hub") {
        if (typeof window !== "undefined" && manualViews !== undefined) {
          localStorage.setItem("tt_hub_manual_views", String(manualViews));
        }
        if (manualViews !== undefined) {
          fetch("/api/v1/traffic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "set_views", views: Number(manualViews) }),
          }).catch(() => {});
        }
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingPage.id || p.slug === "" || p.page_key === "public_hub"
              ? {
                  ...p,
                  name: editingPage.name,
                  status: editingPage.status,
                  config: updatedConfig,
                  views_count: manualViews !== undefined ? Number(manualViews) : p.views_count,
                  conversion_percentage:
                    manualViews && Number(manualViews) > 0
                      ? Number((((p.leads_count || 0) / Number(manualViews)) * 100).toFixed(1))
                      : p.conversion_percentage,
                }
              : p
          )
        );
        setEditingPage(null);
        return;
      }

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
        config: updatedConfig,
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
            ? {
                ...data,
                views_count: manualViews !== undefined ? manualViews : p.views_count,
                leads_count: p.leads_count,
                conversion_percentage:
                  manualViews && manualViews > 0
                    ? Number((((p.leads_count || 0) / manualViews) * 100).toFixed(1))
                    : p.conversion_percentage,
              }
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
    if (selectedPageIds.length === 0 || !isOwner) return;
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
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              {formatNumber(pages.length)}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              {pages.filter((p) => p.status === "live").length} live &bull; {pages.filter((p) => p.status === "paused").length} paused
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Live Pages
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">
              {formatNumber(pages.filter((p) => p.status === "live").length)}
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
              {pages.length > 0 ? Math.round((pages.filter((p) => p.status === "live").length / pages.length) * 100) : 0}% active
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            Total Leads
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-600">
              {formatNumber(
                pages.reduce((acc, p) => acc + (p.leads_count || 0), 0)
              )}
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              all-time
            </span>
          </div>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
            Avg Conversion
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">
              {pages.length > 0
                ? formatPercentage(
                    pages.reduce((acc, p) => acc + (p.conversion_percentage || 0), 0) / pages.length
                  )
                : "0.0%"}
            </span>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
              rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Actions & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search & Status Filter */}
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by page name or slug..."
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

        {/* Action Buttons: Connect External Page & Build Page */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setConnectModalOpen(true)}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition shadow-2xs flex items-center justify-center gap-2"
              >
                <Link2 className="w-4 h-4 text-[#255CC1]" />
                <span>Connect External Page</span>
              </button>
              <a
                href="/admin/pages/build"
                className="px-4 py-2.5 bg-[#00215C] hover:bg-[#255CC1] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-[#F1C819]" />
                <span>Build Page</span>
              </a>
            </>
          )}
        </div>
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

            {isOwner && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkActionLoading}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}

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
          {/* MOBILE VIEW (< 768px): Clean Stacked Cards */}
          <div className="md:hidden space-y-3">
            {filteredPages.map((page) => {
              const isLive = page.status === "live";
              const displayName = cleanPageName(page.name);

              return (
                <div
                  key={page.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  {/* Top: Checkbox, Name, Type & Interactive Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedPageIds.includes(page.id)}
                        onChange={() => toggleSelectPage(page.id)}
                        className="w-4 h-4 mt-1 rounded border-slate-300 text-[#00215C] focus:ring-[#255CC1]"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-slate-900 leading-snug break-words">
                          {page.page_key === "public_hub" || page.slug === "" ? "Web Page" : displayName}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <code className="text-[11px] text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded font-mono font-semibold">
                            {page.page_key === "public_hub" || page.slug === "" ? "/" : `/p/${page.slug}`}
                          </code>
                          <button
                            onClick={() => handleCopy(page.page_key === "public_hub" || page.slug === "" ? `${origin}/` : `${origin}/p/${page.slug}`, `slug-${page.id}`)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                            title="Copy link"
                          >
                            {copiedId === `slug-${page.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={page.page_key === "public_hub" || page.slug === "" ? "/" : (page.page_url || `/p/${page.slug}`)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                            title="Open Live Page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Status & Hub Visibility Badges */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => handleToggleLive(page)}
                          className={`touch-target px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs ${
                            isLive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              : page.status === "draft"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                          }`}
                          title={isLive ? "Click to Pause" : "Click to Make Live"}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isLive
                                ? "bg-emerald-500 animate-pulse"
                                : page.status === "draft"
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          />
                          <span className="capitalize">{page.status}</span>
                        </button>
                      ) : (
                        <StatusBadge status={page.status} />
                      )}

                      {page.page_key !== "public_hub" && page.slug !== "" && (
                        <div className="mt-1">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleToggleHubVisibility(page)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition shadow-2xs ${
                                isLive && page.config?.show_in_directory !== false
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                              title="Toggle public webpage visibility"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isLive && page.config?.show_in_directory !== false
                                    ? "bg-blue-600"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span>
                                {isLive && page.config?.show_in_directory !== false
                                  ? "Live on Webpage"
                                  : "Hidden from Webpage"}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isLive && page.config?.show_in_directory !== false
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {isLive && page.config?.show_in_directory !== false
                                ? "Live on Webpage"
                                : "Hidden from Webpage"}
                            </span>
                          )}
                        </div>
                      )}


                    </div>
                  </div>

                  {/* Middle: Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Traffic
                      </span>
                      <span className="text-sm font-black text-slate-800 block">
                        {formatNumber(page.views_count || 0)}
                      </span>
                    </div>
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
                        Conversion
                      </span>
                      <span className="text-sm font-black text-emerald-600">
                        {formatPercentage(page.conversion_percentage)}
                      </span>
                    </div>
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIntegrationModalPage(page);
                          setIntegrationTab("live");
                        }}
                        className="touch-target px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#00215C] border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                        title="Get Live Page Link & Campaign UTM Builder"
                      >
                        <Link2 className="w-3.5 h-3.5 text-[#255CC1]" />
                        <span>Get Links</span>
                      </button>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingPage(page)}
                          className="touch-target p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Page"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicate(page)}
                          className="touch-target p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Duplicate Page"
                        >
                          <CopyPlus className="w-4 h-4" />
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => setDeleteConfirmPage(page)}
                            className="touch-target p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* DESKTOP VIEW (>= 768px): Clean SaaS Data Table */}
          <div className="hidden md:block bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-3 w-10 text-center">
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
                    <th className="py-3.5 px-4">Page</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Traffic</th>
                    <th className="py-3.5 px-4 text-center">Leads</th>
                    <th className="py-3.5 px-4 text-center">Conversion Rate</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPages.map((page) => {
                    const isLive = page.status === "live";
                    const displayName = cleanPageName(page.name);

                    return (
                      <tr
                        key={page.id}
                        className={`hover:bg-slate-50/70 transition-colors group ${
                          selectedPageIds.includes(page.id) ? "bg-blue-50/40" : ""
                        }`}
                      >
                        {/* 1. Checkbox */}
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select page ${page.name}`}
                            checked={selectedPageIds.includes(page.id)}
                            onChange={() => toggleSelectPage(page.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#00215C] focus:ring-[#255CC1]"
                          />
                        </td>

                        {/* 2. Page & Route */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
                              {page.page_key === "public_hub" || page.slug === "" ? "Web Page" : displayName}
                            </span>
                            {page.page_key !== "public_hub" && page.slug !== "" && page.config?.capsule_tag && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-100/80 text-[#00215C] rounded-full border border-blue-200">
                                {page.config.capsule_tag}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs mt-1">
                            <span className="font-mono text-blue-700 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-100 text-[11px] font-semibold">
                              {page.page_key === "public_hub" || page.slug === "" ? "/" : `/p/${page.slug}`}
                            </span>
                            <button
                              onClick={() => handleCopy(page.page_key === "public_hub" || page.slug === "" ? `${origin}/` : `${origin}/p/${page.slug}`, `slug-${page.id}`)}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                              title="Copy live page URL"
                            >
                              {copiedId === `slug-${page.id}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <a
                              href={page.page_key === "public_hub" || page.slug === "" ? "/" : (page.page_url || `/p/${page.slug}`)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-slate-400 hover:text-blue-600 rounded transition"
                              title="Open live page in new tab"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </td>

                        {/* 3. Single Interactive Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleToggleLive(page)}
                              className={`group/status inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition shadow-2xs ${
                                isLive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                                  : page.status === "draft"
                                  ? "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              }`}
                              title={
                                isLive
                                  ? "Status: Live (Click to pause page)"
                                  : page.status === "draft"
                                  ? "Status: Draft (Click to publish live)"
                                  : "Status: Paused (Click to make live)"
                              }
                            >
                              <span
                                className={`w-2 h-2 rounded-full transition-all ${
                                  isLive
                                    ? "bg-emerald-500 animate-pulse group-hover/status:bg-rose-500"
                                    : page.status === "draft"
                                    ? "bg-amber-500 group-hover/status:bg-emerald-500"
                                    : "bg-slate-400 group-hover/status:bg-emerald-500"
                                }`}
                              />
                              <span className="capitalize">
                                {page.status}
                              </span>
                            </button>
                          ) : (
                            <StatusBadge status={page.status} />
                          )}

                          {page.page_key !== "public_hub" && page.slug !== "" && (
                            <div className="mt-1.5">
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleHubVisibility(page)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition shadow-2xs ${
                                    isLive && page.config?.show_in_directory !== false
                                      ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                      : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                                  }`}
                                  title={
                                    isLive && page.config?.show_in_directory !== false
                                      ? "Live on Webpage: Click to hide"
                                      : !isLive
                                      ? "Hidden: Page must be Live to show on webpage"
                                      : "Hidden from Webpage: Click to show on webpage"
                                  }
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isLive && page.config?.show_in_directory !== false
                                        ? "bg-blue-600"
                                        : "bg-slate-400"
                                    }`}
                                  />
                                  <span>
                                    {isLive && page.config?.show_in_directory !== false
                                      ? "Live on Webpage"
                                      : "Hidden from Webpage"}
                                  </span>
                                </button>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isLive && page.config?.show_in_directory !== false
                                      ? "bg-blue-50 text-blue-700"
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                                >
                                  {isLive && page.config?.show_in_directory !== false
                                    ? "Live on Webpage"
                                    : "Hidden"}
                                </span>
                              )}
                            </div>
                          )}
                        </td>



                        {/* 4. Traffic / Page Views */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-extrabold text-xs font-mono">
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span>{formatNumber(page.views_count || 0)}</span>
                          </div>
                        </td>

                        {/* 5. Leads Captured */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-extrabold text-slate-900 text-sm font-mono">
                            {formatNumber(page.leads_count)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium ml-1">leads</span>
                        </td>

                        {/* 5. Conversion Rate */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="font-extrabold text-emerald-600 text-xs font-mono bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg inline-block">
                            {formatPercentage(page.conversion_percentage)}
                          </span>
                        </td>

                        {/* 5. Unified Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIntegrationModalPage(page);
                                setIntegrationTab("live");
                              }}
                              className="px-3 py-1.5 text-xs font-bold text-[#00215C] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition shadow-2xs"
                              title="Get Live Page Link & Campaign UTM Builder"
                            >
                              <Link2 className="w-3.5 h-3.5 text-[#255CC1]" />
                              <span>Get Links</span>
                            </button>

                            {canEdit && (
                              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                                <button
                                  onClick={() => setEditingPage(page)}
                                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Edit page settings"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDuplicate(page)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                  title="Duplicate page"
                                >
                                  <CopyPlus className="w-4 h-4" />
                                </button>
                                {isOwner && (
                                  <button
                                    onClick={() => setDeleteConfirmPage(page)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete page"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
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
            {/* 1. Auto-Fetched Information & Performance Metrics */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl">
              <div className="flex items-center justify-between text-xs pb-2.5 mb-2.5 border-b border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      editingPage.status === "live"
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-slate-400"
                    }`}
                  />
                  <span className="font-bold text-slate-800">
                    Status: <span className="capitalize text-blue-700">{editingPage.status}</span>
                  </span>
                  {editingPage.status === "live" && editingPage.config?.show_in_directory !== false ? (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Live on Webpage
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      Hidden from Webpage
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-slate-500">/p/{editingPage.slug}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`${origin}/p/${editingPage.slug}`, `edit-slug-${editingPage.id}`)}
                    className="p-1 hover:bg-white rounded transition text-slate-400 hover:text-slate-700"
                    title="Copy URL"
                  >
                    {copiedId === `edit-slug-${editingPage.id}` ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={editingPage.page_url || `/p/${editingPage.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1 hover:bg-white rounded transition text-slate-400 hover:text-blue-600"
                    title="Open Page"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Auto-Fetched Column Information */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Auto Views</span>
                  <span className="font-mono font-black text-sm text-slate-800">
                    {formatNumber(editingPage.views_count || 0)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Total Leads</span>
                  <span className="font-mono font-black text-sm text-blue-700">
                    {formatNumber(editingPage.leads_count || 0)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Conversion</span>
                  <span className="font-mono font-black text-sm text-emerald-600">
                    {formatPercentage(editingPage.conversion_percentage || 0)}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="block text-[10px] uppercase font-bold text-slate-400">Page Key</span>
                  <span className="font-mono font-bold text-[11px] text-slate-600 truncate block">
                    {editingPage.page_key || "public_hub"}
                  </span>
                </div>
              </div>
            </div>

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

            {/* 1. Live in Page & Auto-Fetched Extra Information */}
            <div className="p-4 bg-gradient-to-br from-slate-50 to-blue-50/40 border border-slate-200/90 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#00215C] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Page Status &amp; Auto-Fetched Real-Time Stats</span>
                </h4>
                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Live Data Sync
                </span>
              </div>

              {/* Status Switch & Set View Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Page Status (Live / Draft) Toggle */}
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Page Status: Active &amp; Live</span>
                    <span className="text-[11px] text-slate-500">
                      {editingPage.status === "live" ? "🟢 Page is Active & Live at /p/" + editingPage.slug : "⚪ Draft / Inactive (Closed)"}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPage.status === "live"}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          status: e.target.checked ? "live" : "draft",
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Set View Number */}
                <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Set View Number
                    </label>
                    <span className="text-[10px] font-semibold text-slate-400 font-mono">
                      Auto: {editingPage.views_count || 0}
                    </span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1500 (Leave blank for auto)"
                    value={editingPage.config?.views_count ?? editingPage.views_count ?? ""}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setEditingPage({
                        ...editingPage,
                        views_count: typeof val === "number" ? val : editingPage.views_count,
                        config: {
                          ...(editingPage.config || {}),
                          views_count: val,
                        },
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Auto-Fetched Extra Information Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 bg-white/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Traffic / Views</span>
                  <span className="text-xs font-extrabold text-slate-800 font-mono">
                    {formatNumber(editingPage.views_count || 0)}
                  </span>
                </div>
                <div className="p-2 bg-white/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Inbound Leads</span>
                  <span className="text-xs font-extrabold text-blue-700 font-mono">
                    {formatNumber(editingPage.leads_count || editingPageLeads.length || 0)}
                  </span>
                </div>
                <div className="p-2 bg-white/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Conversion Rate</span>
                  <span className="text-xs font-extrabold text-emerald-600 font-mono">
                    {formatPercentage(editingPage.conversion_percentage)}
                  </span>
                </div>
                <div className="p-2 bg-white/90 border border-slate-200/70 rounded-xl shadow-2xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Created</span>
                  <span className="text-xs font-bold text-slate-700">
                    {editingPage.created_at ? new Date(editingPage.created_at).toLocaleDateString() : "Active"}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Web Page Live Visibility & Public View Options */}
            <div className="p-4 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/50 border-2 border-blue-200 rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#00215C] flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>Web Page Visibility (Public View)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Only pages marked <strong>Live</strong> and enabled for <strong>Public View</strong> will appear on the Web Page (<code className="text-blue-700 font-mono">/</code>).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs inline-flex items-center gap-1"
                  >
                    <span>View Web Page</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setTestimonialsModalOpen(true)}
                    className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs inline-flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3 text-amber-600" />
                    <span>Stories Marquee</span>
                  </button>
                </div>
              </div>

              {/* Real-Time Live Status Banner */}
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                editingPage.status === "live" && editingPage.config?.show_in_directory !== false
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : editingPage.status !== "live"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-slate-50 border-slate-200 text-slate-600"
              }`}>
                <div className="flex items-center gap-2 font-semibold">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    editingPage.status === "live" && editingPage.config?.show_in_directory !== false
                      ? "bg-emerald-500 animate-pulse"
                      : editingPage.status !== "live"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`} />
                  <span>
                    {editingPage.status === "live" && editingPage.config?.show_in_directory !== false
                      ? "Page is LIVE and visible to the public on the Web Page (/)"
                      : editingPage.status !== "live"
                      ? `Page is HIDDEN: Status is "${editingPage.status}". Must be set to 'Live' to appear on Web Page.`
                      : "Page is HIDDEN: Public view in Web Page is currently disabled."}
                  </span>
                </div>
                {editingPage.status !== "live" && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditingPage({
                        ...editingPage,
                        status: "live",
                        config: {
                          ...(editingPage.config || {}),
                          show_in_directory: true,
                        },
                      })
                    }
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0 ml-2 shadow-2xs"
                  >
                    Make Live in Web Page Now
                  </button>
                )}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <label className={`p-3 bg-white border-2 rounded-xl flex items-center gap-3 cursor-pointer shadow-2xs transition ${
                  editingPage.config?.show_in_directory !== false
                    ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/20"
                    : "border-slate-200 hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={editingPage.config?.show_in_directory !== false}
                    onChange={(e) => {
                      const willBeShown = e.target.checked;
                      setEditingPage({
                        ...editingPage,
                        status: willBeShown && editingPage.status !== "live" ? "live" : editingPage.status,
                        config: {
                          ...(editingPage.config || {}),
                          show_in_directory: willBeShown,
                        },
                      });
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Live in Web Page</span>
                    <span className="text-[10px] text-slate-500">Public view on / directory</span>
                  </div>
                </label>

                <label className="p-3 bg-white border border-amber-200/80 rounded-xl flex items-center gap-2.5 cursor-pointer shadow-2xs hover:border-amber-300 transition">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPage.config?.is_featured)}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        config: {
                          ...(editingPage.config || {}),
                          is_featured: e.target.checked,
                        },
                      })
                    }
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <div>
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-900">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                      <span>Feature in Grid</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Highlight card</span>
                  </div>
                </label>

                <label className="p-3 bg-white border border-orange-200/80 rounded-xl flex items-center gap-2.5 cursor-pointer shadow-2xs hover:border-orange-300 transition">
                  <input
                    type="checkbox"
                    checked={Boolean(editingPage.config?.is_hero_trending)}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        config: {
                          ...(editingPage.config || {}),
                          is_hero_trending: e.target.checked,
                          hero_badge: editingPage.config?.hero_badge || "🔥 HIGH DEMAND",
                          hero_cta_label: editingPage.config?.hero_cta_label || "Start Free Check",
                        },
                      })
                    }
                    className="w-4 h-4 text-orange-600 rounded border-orange-300 focus:ring-orange-500"
                  />
                  <div>
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-950">
                      <Flame className="w-3 h-3 fill-orange-500 text-orange-600" />
                      <span>Hero Spotlight (#trend)</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Showcase in hero</span>
                  </div>
                </label>
              </div>

              {/* Hero Spotlight Options if enabled */}
              {editingPage.config?.is_hero_trending && (
                <div className="p-3 bg-orange-50/80 border border-orange-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-900 mb-1">
                      Hero Badge Text
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 🔥 HIGH DEMAND, ⚡ TRENDING NOW"
                      value={editingPage.config?.hero_badge || "🔥 HIGH DEMAND"}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          config: {
                            ...(editingPage.config || {}),
                            hero_badge: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg text-xs font-bold text-orange-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-900 mb-1">
                      Hero CTA Button Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Start Free Check, View Guide"
                      value={editingPage.config?.hero_cta_label || "Start Free Check"}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          config: {
                            ...(editingPage.config || {}),
                            hero_cta_label: e.target.value,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 bg-white border border-orange-300 rounded-lg text-xs font-bold text-orange-950"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Capsule Tag & Card Badges */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Capsule Tag (Top Pill on Card: Calculator, Visa, Guide, etc.)
                </label>
                {editingPage.config?.capsule_tag && (
                  <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#00215C] text-white rounded-full shadow-2xs">
                    Live Pill: {editingPage.config.capsule_tag}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. Calculator, Visa Check, Job Kit, Guide, PR Points, or custom..."
                  value={editingPage.config?.capsule_tag || ""}
                  onChange={(e) =>
                    setEditingPage({
                      ...editingPage,
                      config: {
                        ...(editingPage.config || {}),
                        capsule_tag: e.target.value,
                      },
                    })
                  }
                  className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex flex-wrap items-center gap-1">
                  {Array.from(new Set([
                    "Calculator", "Visa Check", "Guide", "Job Kit", "PR Points", "CRS Score", "Quiz",
                    ...(editingPage.config?.capsule_tag ? [editingPage.config.capsule_tag] : [])
                  ])).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() =>
                        setEditingPage({
                          ...editingPage,
                          config: {
                            ...(editingPage.config || {}),
                            capsule_tag: preset,
                          },
                        })
                      }
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                        editingPage.config?.capsule_tag === preset
                          ? "bg-[#00215C] text-white border-[#00215C]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Country Flag & Icon Selectors */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                {/* 1. Country Flag Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Country Flag (Choose Flag for Card &amp; Filter)
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Selected: {editingPage.config?.country_tag || "Global"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {[
                      { name: "Germany", flag: "🇩🇪" },
                      { name: "Austria", flag: "🇦🇹" },
                      { name: "Sweden", flag: "🇸🇪" },
                      { name: "EU", flag: "🇪🇺" },
                      { name: "UK", flag: "🇬🇧" },
                      { name: "US", flag: "🇺🇸" },
                      { name: "Canada", flag: "🇨🇦" },
                      { name: "Australia", flag: "🇦🇺" },
                      { name: "Ireland", flag: "🇮🇪" },
                      { name: "UAE", flag: "🇦🇪" },
                      { name: "Global", flag: "🌐" },
                      ...(editingPage.config?.country_tag &&
                        !["germany", "austria", "sweden", "eu", "uk", "us", "canada", "australia", "ireland", "uae", "global"].includes(editingPage.config.country_tag.toLowerCase())
                        ? [{ name: editingPage.config.country_tag, flag: "🌍" }]
                        : [])
                    ].map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() =>
                          setEditingPage({
                            ...editingPage,
                            config: {
                              ...(editingPage.config || {}),
                              country_tag: c.name,
                            },
                          })
                        }
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition ${
                          (editingPage.config?.country_tag || "Global").toLowerCase() === c.name.toLowerCase()
                            ? "bg-[#00215C] text-white border-[#00215C] shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add custom country (e.g. France, New Zealand, Singapore, Italy)..."
                      value={editingPage.config?.country_tag || ""}
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          config: {
                            ...(editingPage.config || {}),
                            country_tag: e.target.value,
                          },
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    {editingPage.config?.country_tag && (
                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                        {editingPage.config.country_tag}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Card Icon Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Card Floating Icon (Choose Icon or Add Custom Emoji)
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      Selected: {editingPage.config?.icon_type || "calculator"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                    {[
                      { id: "calculator", label: "Calculator", icon: "🧮" },
                      { id: "compass", label: "Compass", icon: "🧭" },
                      { id: "briefcase", label: "Careers", icon: "💼" },
                      { id: "graduation", label: "Study", icon: "🎓" },
                      { id: "shield", label: "Security", icon: "🛡️" },
                      { id: "file", label: "PDF Guide", icon: "📄" },
                      { id: "plane", label: "Mobility", icon: "✈️" },
                      { id: "card", label: "Blue Card", icon: "💳" },
                      { id: "users", label: "Talent", icon: "👥" },
                      { id: "heart", label: "Healthcare", icon: "🩺" },
                      { id: "award", label: "Points", icon: "🏆" },
                      { id: "check", label: "Eligibility", icon: "🔍" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setEditingPage({
                            ...editingPage,
                            config: {
                              ...(editingPage.config || {}),
                              icon_type: item.id,
                            },
                          })
                        }
                        className={`p-2 text-xs font-semibold rounded-xl border flex flex-col items-center gap-1 transition ${
                          (editingPage.config?.icon_type || "calculator") === item.id
                            ? "bg-[#00215C] text-white border-[#00215C] shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span className="text-[10px] truncate max-w-full">{item.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Emoji / Icon Input */}
                  <div className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Custom Icon / Emoji:</span>
                    <input
                      type="text"
                      placeholder="Type custom emoji (e.g. 🚀, ⚡, 🎯, 💡, 🌐, 📊, 🌍) or icon name..."
                      value={
                        ["calculator", "compass", "briefcase", "graduation", "shield", "file", "plane", "card", "users", "heart", "award", "check"].includes(editingPage.config?.icon_type || "")
                          ? ""
                          : editingPage.config?.icon_type || ""
                      }
                      onChange={(e) =>
                        setEditingPage({
                          ...editingPage,
                          config: {
                            ...(editingPage.config || {}),
                            icon_type: e.target.value || "calculator",
                          },
                        })
                      }
                      className="flex-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    />
                    <div className="flex items-center gap-1">
                      {["🚀", "⚡", "🎯", "💡", "🌐", "📊"].map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() =>
                            setEditingPage({
                              ...editingPage,
                              config: {
                                ...(editingPage.config || {}),
                                icon_type: emo,
                              },
                            })
                          }
                          className="px-1.5 py-0.5 hover:bg-slate-100 rounded text-sm transition"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Category Filter
                    </label>
                    {editingPage.config?.category && !["careers", "calculators", "guides", "visas", "consultation"].includes(editingPage.config.category) && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                        Custom Category
                      </span>
                    )}
                  </div>
                  <select
                    value={
                      ["careers", "calculators", "guides", "visas", "consultation"].includes(editingPage.config?.category || "calculators")
                        ? editingPage.config?.category || "calculators"
                        : "__custom__"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingPage({
                        ...editingPage,
                        config: {
                          ...(editingPage.config || {}),
                          category: val === "__custom__" ? (editingPage.config?.category || "Tools") : val,
                        },
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                  >
                    <option value="careers">💼 Careers &amp; Jobs</option>
                    <option value="calculators">🧮 Calculators</option>
                    <option value="guides">📘 Guides &amp; Checklists</option>
                    <option value="visas">✈️ Visas &amp; Mobility</option>
                    <option value="consultation">📞 1-on-1 Consultation</option>
                    <option value="__custom__">➕ Add Custom Category...</option>
                  </select>

                  {/* Custom Category Input if custom selected */}
                  {(!["careers", "calculators", "guides", "visas", "consultation"].includes(editingPage.config?.category || "calculators") ||
                    editingPage.config?.category === "__custom__") && (
                    <div className="mt-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        placeholder="Type custom category name (e.g. Tools, Scholarships, Sponsorships)..."
                        value={editingPage.config?.category === "__custom__" ? "" : (editingPage.config?.category || "")}
                        onChange={(e) =>
                          setEditingPage({
                            ...editingPage,
                            config: {
                              ...(editingPage.config || {}),
                              category: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 bg-blue-50/40 border border-blue-200 rounded-lg text-xs font-bold text-[#00215C]"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Est. Time Tag
                    </label>
                    <span className="text-[10px] font-mono text-slate-400">
                      {editingPage.config?.est_time || "60–90 sec"}
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 60 sec, 2 mins"
                    value={editingPage.config?.est_time || ""}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        config: {
                          ...(editingPage.config || {}),
                          est_time: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs mb-1.5"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    {["30 sec", "60 sec", "90 sec", "2 mins", "3 mins", "5 mins"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setEditingPage({
                            ...editingPage,
                            config: {
                              ...(editingPage.config || {}),
                              est_time: t,
                            },
                          })
                        }
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition ${
                          editingPage.config?.est_time === t
                            ? "bg-[#00215C] text-white border-[#00215C]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Upload Thumbnail Image & Live Card Preview */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Thumbnail Image &amp; Live Card Preview
                </label>
                <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Matches Website Component
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Live Card Preview Box */}
                <div className="w-full sm:w-56 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col flex-shrink-0">
                  {/* Thumbnail header */}
                  <div
                    className="h-24 relative p-2.5 flex items-end justify-between"
                    style={{
                      background: editingPage.config?.thumbnail_url
                        ? `url(${editingPage.config.thumbnail_url}) center/cover no-repeat`
                        : "linear-gradient(135deg, #00215C 0%, #185ADB 60%, #93C5FD 100%)",
                    }}
                  >
                    <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                    {/* Floating Icon Badge */}
                    <div className="w-8 h-8 rounded-lg bg-white shadow-md border border-slate-100 flex items-center justify-center text-sm relative z-10 -mb-2">
                      {editingPage.config?.icon_type === "heart" ? "🩺" :
                       editingPage.config?.icon_type === "briefcase" ? "💼" :
                       editingPage.config?.icon_type === "graduation" ? "🎓" :
                       editingPage.config?.icon_type === "shield" ? "🛡️" :
                       editingPage.config?.icon_type === "file" ? "📄" :
                       editingPage.config?.icon_type === "plane" ? "✈️" :
                       editingPage.config?.icon_type === "card" ? "💳" :
                       editingPage.config?.icon_type === "users" ? "👥" :
                       editingPage.config?.icon_type === "award" ? "🏆" :
                       editingPage.config?.icon_type === "check" ? "🔍" :
                       editingPage.config?.icon_type === "compass" ? "🧭" : "🧮"}
                    </div>
                    {/* Country Badge */}
                    <span className="relative z-10 text-[10px] font-bold bg-white/95 px-2 py-0.5 rounded shadow-xs text-slate-800">
                      {editingPage.config?.country_tag || "Global"}
                    </span>
                    {/* Capsule Tag Pill */}
                    <span className="absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/95 text-[#00215C] shadow-2xs">
                      {editingPage.config?.capsule_tag || "Calculator"}
                    </span>
                  </div>

                  {/* Body Preview */}
                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {editingPage.name || "Calculator Title"}
                      </div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">
                        Find out your eligibility under official immigration rules.
                      </div>
                    </div>
                    <div className="w-full py-1 bg-slate-50 border border-slate-200 rounded-lg text-center text-[10px] font-bold text-[#00215C]">
                      Start →
                    </div>
                  </div>
                </div>

                {/* Upload Controls */}
                <div className="flex-1 space-y-2.5 w-full">
                  <span className="text-xs text-slate-600 block">
                    Upload a high-resolution thumbnail image or enter an image URL to replace the default gradient.
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition shadow-2xs inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Image</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (loadEvt) => {
                              const dataUrl = loadEvt.target?.result;
                              setEditingPage({
                                ...editingPage,
                                config: {
                                  ...(editingPage.config || {}),
                                  thumbnail_url: dataUrl,
                                },
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>

                    {editingPage.config?.thumbnail_url && (
                      <button
                        type="button"
                        onClick={() =>
                          setEditingPage({
                            ...editingPage,
                            config: {
                              ...(editingPage.config || {}),
                              thumbnail_url: undefined,
                            },
                          })
                        }
                        className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-semibold transition"
                      >
                        Remove Thumbnail
                      </button>
                    )}
                  </div>

                  <input
                    type="url"
                    placeholder="Or paste image URL (https://...)"
                    value={editingPage.config?.thumbnail_url || ""}
                    onChange={(e) =>
                      setEditingPage({
                        ...editingPage,
                        config: {
                          ...(editingPage.config || {}),
                          thumbnail_url: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            {/* 5. Webpage & Form Analytics (wrt Forms in It) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Webpage &amp; Form-Level Inbound Analytics
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalyticsModalPage(editingPage)}
                  className="px-2.5 py-1 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-100/70 hover:bg-blue-100 rounded-lg transition inline-flex items-center gap-1"
                >
                  <span>Detailed View</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              {/* 4 Form Analytics Mini Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-0.5">
                    <span>📞</span>
                    <span>1:1 Consultation</span>
                  </div>
                  <div className="text-base font-extrabold text-blue-700 font-mono">
                    {editingPageLeads.filter((l) => getLeadFormCategory(l).formKey === "consultation").length}
                  </div>
                  <span className="text-[10px] text-slate-500">consultation leads</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 font-bold text-purple-900 mb-0.5">
                    <span>🧮</span>
                    <span>Assessment Form</span>
                  </div>
                  <div className="text-base font-extrabold text-purple-700 font-mono">
                    {editingPageLeads.filter((l) => getLeadFormCategory(l).formKey === "calculator").length}
                  </div>
                  <span className="text-[10px] text-slate-500">calculator completes</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 mb-0.5">
                    <span>📄</span>
                    <span>PDF Guide Form</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-700 font-mono">
                    {editingPageLeads.filter((l) => getLeadFormCategory(l).formKey === "pdf").length}
                  </div>
                  <span className="text-[10px] text-slate-500">guide downloads</span>
                </div>

                <div className="p-2.5 bg-white border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-0.5">
                    <span>💬</span>
                    <span>Quick Callback</span>
                  </div>
                  <div className="text-base font-extrabold text-emerald-700 font-mono">
                    {editingPageLeads.filter((l) => getLeadFormCategory(l).formKey === "quick").length}
                  </div>
                  <span className="text-[10px] text-slate-500">callback requests</span>
                </div>
              </div>
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
                source: "manychat",
                keyword: integrationModalPage.keyword || "DIRECT",
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
    "source": "direct",
    "consent": true
  }'`;

            return (
              <div className="space-y-4">
                {/* Method Switcher Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIntegrationTab("live")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      integrationTab === "live"
                        ? "bg-white text-[#00215C] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Live & Social Links
                  </button>
                  <button
                    type="button"
                    onClick={() => setIntegrationTab("script")}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                      integrationTab === "script"
                        ? "bg-white text-[#00215C] shadow-2xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    1-Line Embed Script
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

                {/* Tab 0: Live & Social Links */}
                {integrationTab === "live" && (
                  <div className="space-y-4">
                    {/* Live Public Direct URL */}
                    <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-blue-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Direct Public Page URL (Default)
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                          Direct Link &bull; Live
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Default clean link with zero tracking parameters. Inbound visitors will automatically be recorded with source: <span className="font-mono font-bold text-slate-700">direct</span>.
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          readOnly
                          value={`${origin}/p/${integrationModalPage.slug}`}
                          className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopy(`${origin}/p/${integrationModalPage.slug}`, "live-url")}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                        >
                          {copiedId === "live-url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === "live-url" ? "Copied" : "Copy"}</span>
                        </button>
                        <a
                          href={`${origin}/p/${integrationModalPage.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition flex-shrink-0"
                          title="Open live assessment in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Campaign UTM Builder Feature Card */}
                    <div className="p-4 bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white border border-blue-200 rounded-2xl space-y-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#255CC1]" />
                          <h4 className="font-bold text-xs uppercase tracking-wider text-[#00215C]">
                            Campaign UTM Builder (Feature)
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                          Optional Tracking
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Running an Instagram ad, bio link, WhatsApp blast, or email newsletter? Tag your link with custom UTM parameters below to identify marketing sources in your Leads CRM.
                      </p>

                      {/* Source Quick-Selector Chips */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          1. Quick Source Preset
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: "instagram", label: "Instagram" },
                            { id: "facebook", label: "Facebook" },
                            { id: "whatsapp", label: "WhatsApp" },
                            { id: "youtube", label: "YouTube" },
                            { id: "linkedin", label: "LinkedIn" },
                            { id: "email", label: "Email" },
                            { id: "google", label: "Google" },
                          ].map((src) => {
                            const isSelected = utmSource.toLowerCase() === src.id;
                            return (
                              <button
                                key={src.id}
                                type="button"
                                onClick={() => setUtmSource(isSelected ? "" : src.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                  isSelected
                                    ? "bg-[#00215C] text-white border-[#00215C] shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                                }`}
                              >
                                {src.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Medium Quick-Selector Chips */}
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          2. Quick Medium Preset
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { id: "dm", label: "DM / Chat" },
                            { id: "bio", label: "Bio Link" },
                            { id: "story", label: "Story" },
                            { id: "post", label: "Post / Reel" },
                            { id: "ad", label: "Paid Ad" },
                            { id: "newsletter", label: "Newsletter" },
                          ].map((med) => {
                            const isSelected = utmMedium.toLowerCase() === med.id;
                            return (
                              <button
                                key={med.id}
                                type="button"
                                onClick={() => setUtmMedium(isSelected ? "" : med.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                                  isSelected
                                    ? "bg-[#255CC1] text-white border-[#255CC1] shadow-2xs"
                                    : "bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                                }`}
                              >
                                {med.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Inputs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            utm_source
                          </label>
                          <input
                            type="text"
                            value={utmSource}
                            onChange={(e) => setUtmSource(e.target.value)}
                            placeholder="e.g. instagram"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            utm_medium
                          </label>
                          <input
                            type="text"
                            value={utmMedium}
                            onChange={(e) => setUtmMedium(e.target.value)}
                            placeholder="e.g. bio, dm, ad"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            utm_campaign
                          </label>
                          <input
                            type="text"
                            value={utmCampaign}
                            onChange={(e) => setUtmCampaign(e.target.value)}
                            placeholder="e.g. fall_launch_2026"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            utm_term (Keyword)
                          </label>
                          <input
                            type="text"
                            value={utmTerm}
                            onChange={(e) => setUtmTerm(e.target.value)}
                            placeholder="e.g. express_entry"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            utm_content (Ad / Reel CTA)
                          </label>
                          <input
                            type="text"
                            value={utmContent}
                            onChange={(e) => setUtmContent(e.target.value)}
                            placeholder="e.g. hero_banner_v2, reel_nov5"
                            className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Generated Tagged URL Display */}
                      <div className="pt-1.5 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          <span>Generated Campaign Link</span>
                          {(utmSource || utmMedium || utmCampaign || utmTerm || utmContent) && (
                            <button
                              type="button"
                              onClick={handleResetUtm}
                              className="text-rose-600 hover:text-rose-800 lowercase font-medium underline"
                            >
                              reset to direct
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={getCustomCampaignUrl(integrationModalPage.slug)}
                            className="w-full bg-white px-3 py-2 border border-blue-200 rounded-xl text-xs font-mono text-blue-900 select-all"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const campaignUrl = getCustomCampaignUrl(integrationModalPage.slug);
                              handleCopy(campaignUrl, "campaign-utm-url");
                            }}
                            className="px-3.5 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                          >
                            {copiedId === "campaign-utm-url" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedId === "campaign-utm-url" ? "Copied" : "Copy Campaign Link"}</span>
                          </button>
                          {(utmSource || utmMedium || utmCampaign || utmTerm || utmContent) && (
                            <a
                              href={getCustomCampaignUrl(integrationModalPage.slug)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-blue-100/60 text-blue-800 hover:bg-blue-200 rounded-xl transition flex-shrink-0"
                              title="Test campaign link in new tab"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* Delete Confirmation Modal */}
      {deleteConfirmPage && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmPage(null)}
          title="Delete Page"
          description={`Are you sure you want to permanently delete "${deleteConfirmPage.name}"?`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Permanent Action</span>
              </p>
              <p>
                Deleting this page will remove its route (<code>/p/{deleteConfirmPage.slug}</code>). Any inbound links or active social campaigns using this URL will stop working.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmPage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Page</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. Dedicated Page & Form Analytics Modal */}
      {analyticsModalPage && (
        <Modal
          isOpen={!!analyticsModalPage}
          onClose={() => {
            setAnalyticsModalPage(null);
            setAnalyticsSearch("");
            setAnalyticsFormFilter("all");
          }}
          title={`Analytics: ${cleanPageName(analyticsModalPage.name)}`}
          description={`Route: /p/${analyticsModalPage.slug} • Form performance and inbound candidate captures`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Top Page Context Bar */}
            <div className="p-3 bg-gradient-to-r from-blue-50/70 to-slate-50 border border-blue-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  analyticsModalPage.status === "live"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {analyticsModalPage.status.toUpperCase()}
                </span>
                {analyticsModalPage.config?.capsule_tag && (
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-[#00215C] text-white rounded-full">
                    {analyticsModalPage.config.capsule_tag}
                  </span>
                )}
                <span className="font-mono text-xs font-semibold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                  /p/{analyticsModalPage.slug}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={analyticsModalPage.page_url || `/p/${analyticsModalPage.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Open Page</span>
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </a>

                <button
                  type="button"
                  onClick={() =>
                    exportLeadsToCsv(
                      analyticsFormFilter === "all"
                        ? analyticsLeads
                        : analyticsLeads.filter(
                            (l) => getLeadFormCategory(l).formKey === analyticsFormFilter
                          ),
                      analyticsModalPage.name
                    )
                  }
                  disabled={analyticsLeads.length === 0}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* Top 4 KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>Page Views</span>
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-xl font-extrabold text-slate-900 font-mono">
                  {formatNumber(analyticsModalPage.views_count || 0)}
                </div>
                <span className="text-[10px] text-slate-400">
                  {analyticsModalPage.config?.views_count !== undefined ? "Manual override active" : "Auto-tracked visits"}
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>Inbound Leads</span>
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-xl font-extrabold text-purple-700 font-mono">
                  {analyticsLeads.length || formatNumber(analyticsModalPage.leads_count || 0)}
                </div>
                <span className="text-[10px] text-purple-600 font-medium">
                  Verified candidate submissions
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>Conversion Rate</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-extrabold text-emerald-600 font-mono">
                  {formatPercentage(analyticsModalPage.conversion_percentage)}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">
                  Visitor to lead completion
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-1">
                  <span>Form Efficiency</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-extrabold text-amber-600 font-mono">
                  {analyticsLeads.length > 0 ? "88.4%" : "0.0%"}
                </div>
                <span className="text-[10px] text-amber-700 font-medium">
                  Avg. time to submit: 42s
                </span>
              </div>
            </div>

            {/* Form-Level Performance Breakdown */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Performance by In-Page Form Component
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {[
                  {
                    key: "consultation",
                    title: "1:1 Consultation Form",
                    icon: "📞",
                    color: "border-blue-200 bg-blue-50/50",
                    desc: "Free expert consultation bookings",
                  },
                  {
                    key: "calculator",
                    title: "Calculator Assessment Form",
                    icon: "🧮",
                    color: "border-purple-200 bg-purple-50/50",
                    desc: "Quiz points & eligibility submissions",
                  },
                  {
                    key: "pdf",
                    title: "PDF Guide Form",
                    icon: "📄",
                    color: "border-amber-200 bg-amber-50/50",
                    desc: "Lead magnet downloads & checklist gate",
                  },
                  {
                    key: "quick",
                    title: "Quick Callback Form",
                    icon: "💬",
                    color: "border-emerald-200 bg-emerald-50/50",
                    desc: "Rapid response & WhatsApp chats",
                  },
                ].map((item) => {
                  const formLeads = analyticsLeads.filter(
                    (l) => getLeadFormCategory(l).formKey === item.key
                  );
                  const share =
                    analyticsLeads.length > 0
                      ? Math.round((formLeads.length / analyticsLeads.length) * 100)
                      : 0;

                  return (
                    <div
                      key={item.key}
                      onClick={() => setAnalyticsFormFilter(analyticsFormFilter === item.key ? "all" : item.key)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-2xs ${item.color} ${
                        analyticsFormFilter === item.key ? "ring-2 ring-blue-600 shadow-sm" : "hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{item.icon}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono text-slate-700">
                          {share}% share
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                      <div className="text-lg font-extrabold text-slate-900 font-mono mt-0.5">
                        {formLeads.length} <span className="text-xs font-normal text-slate-500">leads</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filterable Leads Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: `All Forms (${analyticsLeads.length})` },
                    {
                      id: "consultation",
                      label: `📞 Consultation (${
                        analyticsLeads.filter((l) => getLeadFormCategory(l).formKey === "consultation").length
                      })`,
                    },
                    {
                      id: "calculator",
                      label: `🧮 Calculator (${
                        analyticsLeads.filter((l) => getLeadFormCategory(l).formKey === "calculator").length
                      })`,
                    },
                    {
                      id: "pdf",
                      label: `📄 PDF Guide (${
                        analyticsLeads.filter((l) => getLeadFormCategory(l).formKey === "pdf").length
                      })`,
                    },
                    {
                      id: "quick",
                      label: `💬 Callback (${
                        analyticsLeads.filter((l) => getLeadFormCategory(l).formKey === "quick").length
                      })`,
                    },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setAnalyticsFormFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        analyticsFormFilter === tab.id
                          ? "bg-[#00215C] text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search candidate name, phone, email..."
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              {/* Inbound Leads Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-80 overflow-y-auto">
                {isLoadingAnalyticsLeads ? (
                  <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>Loading in-page form leads...</span>
                  </div>
                ) : (
                  (() => {
                    const filtered = analyticsLeads.filter((lead) => {
                      if (analyticsFormFilter !== "all") {
                        if (getLeadFormCategory(lead).formKey !== analyticsFormFilter) return false;
                      }
                      if (analyticsSearch.trim()) {
                        const q = analyticsSearch.toLowerCase();
                        const matchName = (lead.name || "").toLowerCase().includes(q);
                        const matchEmail = (lead.email || "").toLowerCase().includes(q);
                        const matchPhone = (lead.phone_e164 || "").toLowerCase().includes(q);
                        const matchCountry = ((lead.utm?.country_interested as string) || lead.country_code || "").toLowerCase().includes(q);
                        if (!matchName && !matchEmail && !matchPhone && !matchCountry) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="py-12 text-center space-y-1">
                          <p className="text-xs font-bold text-slate-600">No leads found for this filter</p>
                          <p className="text-[11px] text-slate-400">
                            Candidate form submissions captured through this page will appear here in real-time.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-100">
                          <tr>
                            <th className="py-2.5 px-3">Candidate</th>
                            <th className="py-2.5 px-3">Contact</th>
                            <th className="py-2.5 px-3">Form Source</th>
                            <th className="py-2.5 px-3">Country / Info</th>
                            <th className="py-2.5 px-3 text-right">Captured</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map((lead) => {
                            const cat = getLeadFormCategory(lead);
                            return (
                              <tr key={lead.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-900">{lead.name || "Anonymous Lead"}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">{lead.email || "No email provided"}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="font-mono font-semibold text-slate-800">
                                    {lead.phone_e164 || "-"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cat.badgeColor}`}>
                                    <span>{cat.icon}</span>
                                    <span>{cat.formTitle}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-slate-700 font-medium">
                                    {(lead.utm?.country_interested as string) || lead.country_code || "Global"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-400 text-[11px] font-mono">
                                  {new Date(lead.created_at).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Connect External Page Modal */}
      <ConnectPageModal
        isOpen={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        existingSlugs={existingSlugs}
        onSavePage={handleConnectPageSave}
      />

      {/* Testimonials Management Modal */}
      <TestimonialsManagementModal
        isOpen={testimonialsModalOpen}
        onClose={() => setTestimonialsModalOpen(false)}
      />
    </div>
  );
}
