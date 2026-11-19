"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalculatorItem,
  TestimonialItem,
  SEED_CALCULATORS,
  SEED_TESTIMONIALS,
  COUNTRIES_LIST,
  TYPES_LIST,
  SORT_OPTIONS,
  COUNTRY_DIAL_CODES,
} from "@/lib/public-directory";

// Exact Flag SVGs from the design
const FLAGS: Record<string, string> = {
  Germany: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="6" fill="#000"/><rect y="6" width="26" height="6" fill="#D00"/><rect y="12" width="26" height="6" fill="#FFCE00"/></svg>`,
  Austria: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="6" fill="#ED2939"/><rect y="6" width="26" height="6" fill="#fff"/><rect y="12" width="26" height="6" fill="#ED2939"/></svg>`,
  Sweden: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#006AA7"/><rect x="7" width="4" height="18" fill="#FECC00"/><rect y="7" width="26" height="4" fill="#FECC00"/></svg>`,
  EU: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#003399"/><circle cx="13.00" cy="3.00" r="1" fill="#FFCC00"/><circle cx="16.00" cy="3.80" r="1" fill="#FFCC00"/><circle cx="18.20" cy="6.00" r="1" fill="#FFCC00"/><circle cx="19.00" cy="9.00" r="1" fill="#FFCC00"/><circle cx="18.20" cy="12.00" r="1" fill="#FFCC00"/><circle cx="16.00" cy="14.20" r="1" fill="#FFCC00"/><circle cx="13.00" cy="15.00" r="1" fill="#FFCC00"/><circle cx="10.00" cy="14.20" r="1" fill="#FFCC00"/><circle cx="7.80" cy="12.00" r="1" fill="#FFCC00"/><circle cx="7.00" cy="9.00" r="1" fill="#FFCC00"/><circle cx="7.80" cy="6.00" r="1" fill="#FFCC00"/><circle cx="10.00" cy="3.80" r="1" fill="#FFCC00"/></svg>`,
  UK: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#012169"/><path d="M0 0l26 18M26 0L0 18" stroke="#fff" stroke-width="2.5"/><path d="M0 0l26 18M26 0L0 18" stroke="#C8102E" stroke-width="1.5"/><path d="M13 0v18M0 9h26" stroke="#fff" stroke-width="4"/><path d="M13 0v18M0 9h26" stroke="#C8102E" stroke-width="2.5"/></svg>`,
  US: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#B22234"/><rect y="1.38" width="26" height="1.38" fill="#fff"/><rect y="4.15" width="26" height="1.38" fill="#fff"/><rect y="6.92" width="26" height="1.38" fill="#fff"/><rect y="9.69" width="26" height="1.38" fill="#fff"/><rect y="12.46" width="26" height="1.38" fill="#fff"/><rect y="15.23" width="26" height="1.38" fill="#fff"/><rect width="10.4" height="9.69" fill="#3C3B6E"/></svg>`,
  USA: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#B22234"/><rect y="1.38" width="26" height="1.38" fill="#fff"/><rect y="4.15" width="26" height="1.38" fill="#fff"/><rect y="6.92" width="26" height="1.38" fill="#fff"/><rect y="9.69" width="26" height="1.38" fill="#fff"/><rect y="12.46" width="26" height="1.38" fill="#fff"/><rect y="15.23" width="26" height="1.38" fill="#fff"/><rect width="10.4" height="9.69" fill="#3C3B6E"/></svg>`,
  Canada: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#fff"/><rect width="6.5" height="18" fill="#D52B1E"/><rect x="19.5" width="6.5" height="18" fill="#D52B1E"/><path d="M13 3l1.4 3 2.2-.8-.8 3.4 2 .6-3.2 2.6.3 1.4-1.9-.3V16h-.0v-2.1l-1.9.3.3-1.4-3.2-2.6 2-.6-.8-3.4 2.2.8z" fill="#D52B1E"/></svg>`,
  Australia: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#012169"/><path d="M0 0l13 9M13 0L0 9" stroke="#fff" stroke-width="2"/><path d="M6.5 0v9M0 4.5h13" stroke="#fff" stroke-width="3"/><path d="M6.5 0v9M0 4.5h13" stroke="#C8102E" stroke-width="1.6"/><circle cx="6.5" cy="14" r="2" fill="#fff"/><circle cx="19" cy="4" r="1.2" fill="#fff"/><circle cx="22" cy="8" r="1.2" fill="#fff"/><circle cx="19" cy="14" r="1.2" fill="#fff"/><circle cx="16" cy="8.5" r="1.2" fill="#fff"/></svg>`,
  Ireland: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#fff"/><rect width="8.7" height="18" fill="#169B62"/><rect x="17.3" width="8.7" height="18" fill="#FF883E"/></svg>`,
  UAE: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="6" fill="#00732F"/><rect y="6" width="26" height="6" fill="#fff"/><rect y="12" width="26" height="6" fill="#000"/><rect width="7" height="18" fill="#FF0000"/></svg>`,
  Global: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#0F172A"/><circle cx="13" cy="9" r="6" fill="none" stroke="#38BDF8" stroke-width="1.2"/><ellipse cx="13" cy="9" rx="3" ry="6" fill="none" stroke="#38BDF8" stroke-width="1"/><line x1="7" y1="9" x2="19" y2="9" stroke="#38BDF8" stroke-width="1"/></svg>`,
  "Hong Kong": `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#DE2910"/><g fill="#fff"><ellipse cx="13" cy="5.6" rx="1.5" ry="2.6" transform="rotate(0 13 9)"/><ellipse cx="13" cy="5.6" rx="1.5" ry="2.6" transform="rotate(72 13 9)"/><ellipse cx="13" cy="5.6" rx="1.5" ry="2.6" transform="rotate(144 13 9)"/><ellipse cx="13" cy="5.6" rx="1.5" ry="2.6" transform="rotate(216 13 9)"/><ellipse cx="13" cy="5.6" rx="1.5" ry="2.6" transform="rotate(288 13 9)"/></g></svg>`,
  Portugal: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="18" fill="#FF0000"/><rect width="10" height="18" fill="#006600"/><circle cx="10" cy="9" r="3.4" fill="#FFCC00"/><circle cx="10" cy="9" r="1.9" fill="#fff"/></svg>`,
  India: `<svg viewBox="0 0 26 18" aria-hidden="true"><rect width="26" height="6" fill="#FF9933"/><rect y="6" width="26" height="6" fill="#fff"/><rect y="12" width="26" height="6" fill="#138808"/><circle cx="13" cy="9" r="2" fill="none" stroke="#000080" stroke-width="0.8"/></svg>`,
};

// Exact Icons SVGs from the design
const ICONS: Record<string, string> = {
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/><path d="M12 9v5M9.5 11.5h5"/></svg>`,
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M6.5 16c.6-1.4 1.5-2 2.5-2s1.9.6 2.5 2M14.5 10h4M14.5 13.5h3"/></svg>`,
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>`,
  calculator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/></svg>`,
  file: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`,
  briefcase: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
  graduation: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  plane: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.5 6.7c-.8-.2-1.6.2-2 .9l-.2.4 5.4 3.7-3.2 3.2-2.1-.6c-.5-.1-1 .1-1.3.5l-.1.1 2.2 2.2 2.2 2.2.1-.1c.4-.3.6-.8.5-1.3l-.6-2.1 3.2-3.2 3.7 5.4.4-.2c.7-.4 1.1-1.2.9-2z"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  award: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>`,
};

const FLAME_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2s5 4.5 5 10a5 5 0 01-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/></svg>`;
const ARROW_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
const CLOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const GIFT_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 13h18M12 8C9 8 8 4 10.5 4S12 8 12 8zm0 0c3 0 4-4 1.5-4S12 8 12 8z"/></svg>`;
const AV_COLORS = ['#F4C95D', '#9EBBF2', '#F3A29A', '#A8DDB5', '#C9B8F0'];

export default function TerraTernPublicCalculatorsHub() {
  // Check sessionStorage for cached public directory data for zero-flash instant render
  const cachedDirectory = typeof window !== "undefined" ? (() => {
    try {
      const raw = sessionStorage.getItem("tt_public_directory");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  })() : null;

  const [calculators, setCalculators] = useState<CalculatorItem[]>(() => cachedDirectory?.calculators || SEED_CALCULATORS);
  const [heroCalc, setHeroCalc] = useState<CalculatorItem>(() => cachedDirectory?.hero_calculator || SEED_CALCULATORS[0]);
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(() => cachedDirectory?.testimonials || SEED_TESTIMONIALS);
  const [loading, setLoading] = useState(() => !cachedDirectory);

  // Filter states
  // Streamlined Filter state (Country, Category/Type, Sort)
  const [searchQuery, setSearchQuery] = useState("");
  const [selCountry, setSelCountry] = useState("All countries");
  const [selType, setSelType] = useState("All types");
  const [selSort, setSelSort] = useState("Trending");

  // Mobile nav toggle
  const [isNavOpen, setIsNavOpen] = useState(false);

  // Lead Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("Get 1:1 Free Counselling");
  const [modalSubtitle, setModalSubtitle] = useState("Talk to a senior TerraTern migration expert today.");
  const [selectedCalcForModal, setSelectedCalcForModal] = useState<CalculatorItem | null>(null);

  // Unified Lead Form fields (Only Name, Email, Phone)
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadDialCode, setLeadDialCode] = useState("+91");
  const [leadCountry, setLeadCountry] = useState("Germany");
  const [leadConsent, setLeadConsent] = useState(true);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState<string | null>(null);

  // Incoming UTM string preserved
  const [urlParamsString, setUrlParamsString] = useState("");

  // Set document title strictly to TerraTern
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "TerraTern";
    }
  }, []);

  // Load public data from API
  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = window.location.search;
      if (search) {
        setUrlParamsString(search.startsWith("?") ? search.substring(1) : search);
      }

      fetch("/api/v1/pages/public")
        .then((res) => res.json())
        .then((data) => {
          if (data?.success) {
            if (Array.isArray(data.calculators) && data.calculators.length > 0) {
              setCalculators(data.calculators);
            }
            if (data.hero_calculator) {
              setHeroCalc(data.hero_calculator);
            }
            if (Array.isArray(data.testimonials) && data.testimonials.length > 0) {
              setTestimonials(data.testimonials);
            }
            try {
              sessionStorage.setItem("tt_public_directory", JSON.stringify(data));
            } catch {}
          }
        })
        .catch((err) => console.warn("Using fallback seed data:", err))
        .finally(() => setLoading(false));
    }
  }, []);

  // Thumbnail gradient generator based on country/category
  const getThumbnailGradient = (countries: string[] = [], capsuleTag: string = "") => {
    const c = (countries[0] || "").toLowerCase();
    const t = capsuleTag.toLowerCase();
    if (c.includes("ireland")) return "linear-gradient(135deg, #064E3B 0%, #059669 60%, #6EE7B7 100%)";
    if (c.includes("germany")) return "linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #F59E0B 100%)";
    if (c.includes("australia")) return "linear-gradient(135deg, #0C4A6E 0%, #0284C7 60%, #7DD3FC 100%)";
    if (c.includes("canada")) return "linear-gradient(135deg, #881337 0%, #E11D48 60%, #FDA4AF 100%)";
    if (c.includes("uae") || c.includes("dubai")) return "linear-gradient(135deg, #451A03 0%, #B45309 60%, #FDE68A 100%)";
    if (c.includes("uk")) return "linear-gradient(135deg, #1E1B4B 0%, #312E81 60%, #818CF8 100%)";
    if (t.includes("guide") || t.includes("pdf")) return "linear-gradient(135deg, #1E293B 0%, #334155 60%, #94A3B8 100%)";
    return "linear-gradient(135deg, #00215C 0%, #185ADB 60%, #93C5FD 100%)";
  };

  // Filter & Search logic
  const filteredCalculators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result = calculators.filter((c) => {
      if (selCountry !== "All countries" && !c.countries.includes(selCountry)) return false;
      if (selType !== "All types") {
        if (selType === "PDFs" && c.type !== "PDFs") return false;
        if (selType === "Calculators" && c.type !== "Calculators") return false;
        if (selType === "Visas" && !c.visas.some((v) => v.toLowerCase().includes("visa") || v.toLowerCase().includes("pr") || v.toLowerCase().includes("card"))) return false;
      }

      if (q) {
        const haystack = `${c.name} ${c.desc} ${c.countries.join(" ")} ${c.visas.join(" ")} ${c.type} ${c.capsule_tag || ""}`.toLowerCase();
        return q.split(/\s+/).every((w) => haystack.includes(w));
      }
      return true;
    });

    if (selSort === "A to Z") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (selSort === "Newest") {
      result.sort((a, b) => (b.rank || 0) - (a.rank || 0));
    } else {
      // Trending
      result.sort((a, b) => (b.hot ? 1 : 0) - (a.hot ? 1 : 0) || (b.rank || 0) - (a.rank || 0));
    }

    return result;
  }, [calculators, searchQuery, selCountry, selType, selSort]);

  const [visibleCount, setVisibleCount] = useState(12);

  // Reset visible count to 12 when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [searchQuery, selCountry, selType, selSort]);

  const visibleCalculators = useMemo(() => {
    return filteredCalculators.slice(0, visibleCount);
  }, [filteredCalculators, visibleCount]);

  const hasActiveFilters = searchQuery.trim() !== "" || selCountry !== "All countries" || selType !== "All types" || selSort !== "Trending";

  const handleClearAll = () => {
    setSearchQuery("");
    setSelCountry("All countries");
    setSelType("All types");
    setSelSort("Trending");
  };

  // Helper to append UTMs to a URL
  const appendUtms = (url: string) => {
    if (!urlParamsString) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}${urlParamsString}`;
  };

  // Open Lead Modal from various triggers
  const openCounsellingModal = (title?: string, subtitle?: string, calc?: CalculatorItem) => {
    setModalTitle(title || "Get 1:1 Free Counselling");
    setModalSubtitle(subtitle || "Talk to a senior TerraTern migration expert today.");
    setSelectedCalcForModal(calc || null);
    if (calc && calc.countries && calc.countries[0]) {
      setLeadCountry(calc.countries[0]);
    }
    setLeadSuccess(false);
    setLeadError(null);
    setIsModalOpen(true);
  };

  // Handle Lead Form Submission
  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadError(null);

    if (!leadPhone.trim() || leadPhone.trim().length < 7) {
      setLeadError("Please enter a valid phone number");
      return;
    }
    if (!leadConsent) {
      setLeadError("Please accept terms to continue");
      return;
    }

    setIsSubmittingLead(true);

    try {
      // Parse UTMs
      const utmObj: Record<string, string> = {};
      if (typeof window !== "undefined") {
        const sp = new URLSearchParams(window.location.search);
        ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((k) => {
          const val = sp.get(k);
          if (val) utmObj[k] = val;
        });
      }

      const fullPhone = `${leadDialCode}${leadPhone.replace(/^0+/, "").trim()}`;

      // Retrieve or generate visitor_id
      let visitorId = "anon";
      if (typeof window !== "undefined") {
        try {
          visitorId = window.localStorage.getItem("tt_vid") || "";
          if (!visitorId) {
            visitorId = "vid_" + Math.random().toString(36).slice(2, 10);
            window.localStorage.setItem("tt_vid", visitorId);
          }
        } catch {}
      }

      const isoCountry =
        leadDialCode === "+91"
          ? "IN"
          : leadDialCode === "+49"
          ? "DE"
          : leadDialCode === "+353"
          ? "IE"
          : leadDialCode === "+61"
          ? "AU"
          : leadDialCode === "+1"
          ? "US"
          : leadDialCode === "+44"
          ? "GB"
          : "IN";

      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_key: (selectedCalcForModal as any)?.page_key || "public_hub",
          visitor_id: visitorId,
          name: leadName.trim() || "Website Visitor",
          email: leadEmail.trim() || undefined,
          phone: fullPhone,
          phone_e164: fullPhone,
          country_code: isoCountry,
          country_interested: leadCountry,
          visa_interested: selectedCalcForModal?.visas?.[0] || "General Mobility",
          calculator_name: modalTitle || selectedCalcForModal?.name || "1:1 Free Counselling Request",
          calculator_slug: selectedCalcForModal?.slug || "frontend-counselling",
          source: utmObj.utm_source || "website_hub",
          utm: {
            ...utmObj,
            page_origin: "frontend_hub",
            form_type: modalTitle.toLowerCase().includes("counselling")
              ? "counselling"
              : modalTitle.toLowerCase().includes("strategy")
              ? "strategy_call"
              : modalTitle.toLowerCase().includes("callback")
              ? "callback"
              : "consultation",
            form_title: modalTitle,
            calculator_name: selectedCalcForModal?.name,
          },
          consent: leadConsent,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request");
      }

      setLeadSuccess(true);
    } catch (err: any) {
      setLeadError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Testimonials splitting for 2 rows
  const { rowA, rowB } = useMemo(() => {
    const a: TestimonialItem[] = [];
    const b: TestimonialItem[] = [];
    testimonials.forEach((t, i) => {
      if (i % 2 === 0) a.push(t);
      else b.push(t);
    });
    return { rowA: a, rowB: b };
  }, [testimonials]);

  return (
    <div className="app-root">
      {/* 1. TOP HEADER */}
      <header className="top">
        <a className="brandlink" href="#top" aria-label="TerraTern home">
          <img
            className="brand"
            src="/images/terratern-header-logo.png"
            alt="TerraTern"
          />
        </a>

        <nav className={`nav ${isNavOpen ? "open" : ""}`} id="nav" aria-label="Main">
          <a href="#calculators" onClick={() => setIsNavOpen(false)}>Calculators</a>
          <a href="#stories" onClick={() => setIsNavOpen(false)}>Testimonials</a>
        </nav>

        <div className="hr">
          <button
            type="button"
            className="hcta cursor-pointer"
            onClick={() => openCounsellingModal("1:1 Consultation Request", "Speak directly with our senior global relocation strategist.")}
          >
            Contact TerraTern
          </button>

          <button
            type="button"
            className="burger"
            id="burger"
            aria-label="Menu"
            aria-expanded={isNavOpen}
            onClick={() => setIsNavOpen(!isNavOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION */}
        <section className="hero" id="top">
          <div className="wrap hero-in">
            {/* Left Hero Column */}
            <div className="hl">
              <span className="tpill">
                <span className="avs">
                  <b>AS</b>
                  <b>RK</b>
                  <b>PM</b>
                </span>
                Trusted by 2M+ Users | 2000+ Visa Success Stories
              </span>

              <h1>
                One Stop Solution to <span>Global Talent Mobility</span>
              </h1>

              <p className="sub">
                TerraTern provides expert visa consultancy for hassle-free global talent migration, your trusted partner every step of the way.
              </p>

              <button
                type="button"
                className="cta-y cursor-pointer"
                onClick={() => openCounsellingModal("1:1 Free Counselling Request", "Claim your limited-time free strategy call with a TerraTern consultant.")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
                </svg>
                Get 1:1 Free counselling <em>Limited time offer</em>
              </button>

              <div className="hero-flags-container">
                <div className="hero-flags-row">
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.Germany} <span>Germany</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.Austria} <span>Austria</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.Sweden} <span>Sweden</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.EU} <span>EU</span>` }} />
                </div>
                <div className="hero-flags-row">
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.UK} <span>UK</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.US || FLAGS.USA} <span>US</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.Canada} <span>Canada</span>` }} />
                  <span className="hero-flag-chip" dangerouslySetInnerHTML={{ __html: `${FLAGS.Australia} <span>Australia</span>` }} />
                </div>
              </div>
            </div>

            {/* Right Hero Column: Exact Calculator Section Component Design in Hero Size */}
            <aside className="hero-calc-container" aria-label="Featured calculator">
              {(() => {
                const flagSvg = heroCalc.countries[0] ? FLAGS[heroCalc.countries[0]] : null;
                const iconSvg = ICONS[heroCalc.icon] || ICONS.check;
                const cardGradient = getThumbnailGradient(heroCalc.countries, heroCalc.capsule_tag);
                const calcUrl = appendUtms(heroCalc.url || `/p/${heroCalc.slug}`);

                return (
                  <a
                    href={calcUrl}
                    className="cc hero-cc"
                    title={`Start ${heroCalc.name}`}
                  >
                    {/* Rich Visual Thumbnail */}
                    <div
                      className="top2"
                      style={{
                        background: heroCalc.thumbnail_url
                          ? `url('${heroCalc.thumbnail_url}') center/cover no-repeat`
                          : cardGradient,
                      }}
                    >
                      <div className="top2-glow" />
                      <span className="ico" dangerouslySetInnerHTML={{ __html: iconSvg }} />
                      {flagSvg && <span className="fl" dangerouslySetInnerHTML={{ __html: flagSvg }} />}
                      {heroCalc.capsule_tag ? (
                        <span className={`tag2 ${heroCalc.hot ? "hot" : ""}`}>
                          {heroCalc.hot && <span dangerouslySetInnerHTML={{ __html: FLAME_ICON }} />}
                          {heroCalc.capsule_tag}
                        </span>
                      ) : heroCalc.hot ? (
                        <span className="tag2 hot">
                          <span dangerouslySetInnerHTML={{ __html: FLAME_ICON }} />
                          Trending
                        </span>
                      ) : (
                        <span className="tag2">{heroCalc.type.replace(/s$/, "")}</span>
                      )}
                    </div>

                    <div className="bd">
                      <div className="tags">
                        {heroCalc.countries.concat(heroCalc.visas).slice(0, 3).map((t, idx) => (
                          <span key={idx}>{t}</span>
                        ))}
                      </div>

                      <h3>{heroCalc.name}</h3>
                      <p>{heroCalc.desc}</p>

                      <div className="stats">
                        <span>
                          <span dangerouslySetInnerHTML={{ __html: CLOCK_ICON }} />
                          About 60–90 seconds
                        </span>
                        <span>
                          <span dangerouslySetInnerHTML={{ __html: GIFT_ICON }} />
                          Free
                        </span>
                      </div>

                      <div className="btn primary">
                        <span>Start</span>
                        <span dangerouslySetInnerHTML={{ __html: ARROW_ICON }} />
                      </div>
                    </div>
                  </a>
                );
              })()}
            </aside>
          </div>
        </section>

        {/* 3. CALCULATORS SECTION WITH ADVANCED FILTERS */}
        <section className="sec" id="calculators">
          <div className="wrap">
            <h2>All our calculators</h2>
            <p className="lead">Choose your country or goal, then start. Each one is free and short.</p>

            {/* Streamlined Single-Row Search & Filters */}
            <div className="fbar-wrap">
              <div className="fbar" role="search">
                <label className="sbox">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Search calculators by name, country or visa..."
                    aria-label="Search calculators"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>

                <label className="dd">
                  <span>Country</span>
                  <select value={selCountry} onChange={(e) => setSelCountry(e.target.value)}>
                    {COUNTRIES_LIST.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </label>

                <label className="dd">
                  <span>Type</span>
                  <select value={selType} onChange={(e) => setSelType(e.target.value)}>
                    {TYPES_LIST.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </label>

                <label className="dd">
                  <span>Sort by</span>
                  <select value={selSort} onChange={(e) => setSelSort(e.target.value)}>
                    {SORT_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </label>

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="clr-btn cursor-pointer"
                    onClick={handleClearAll}
                    aria-label="Clear all filters"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="fbar-meta">
                <p className="count" id="count" aria-live="polite">
                  Showing {visibleCalculators.length} {visibleCalculators.length === 1 ? "calculator" : "calculators"}
                  {filteredCalculators.length > 12 && ` (of ${filteredCalculators.length})`}
                </p>
                {hasActiveFilters && (
                  <span className="filter-badge">Active filters applied</span>
                )}
              </div>
            </div>

            {/* 4-Column Card Grid (Max 3 rows x 4 = 12 cards) */}
            <div className="grid" id="grid">
              {visibleCalculators.map((c) => {
                const flagSvg = FLAGS[c.countries[0]];
                const iconSvg = ICONS[c.icon] || ICONS.check;
                const cardGradient = getThumbnailGradient(c.countries, c.capsule_tag);
                const calcUrl = appendUtms(c.url || `/p/${c.slug}`);

                return (
                  <a
                    key={c.id}
                    href={calcUrl}
                    className="cc"
                    title={`Start ${c.name}`}
                  >
                    {/* Rich Visual Thumbnail */}
                    <div
                      className="top2"
                      style={{
                        background: c.thumbnail_url
                          ? `url('${c.thumbnail_url}') center/cover no-repeat`
                          : cardGradient,
                      }}
                    >
                      <div className="top2-glow" />
                      <span className="ico" dangerouslySetInnerHTML={{ __html: iconSvg }} />
                      {flagSvg && <span className="fl" dangerouslySetInnerHTML={{ __html: flagSvg }} />}
                      {c.capsule_tag ? (
                        <span className={`tag2 ${c.hot ? "hot" : ""}`}>
                          {c.hot && <span dangerouslySetInnerHTML={{ __html: FLAME_ICON }} />}
                          {c.capsule_tag}
                        </span>
                      ) : c.hot ? (
                        <span className="tag2 hot">
                          <span dangerouslySetInnerHTML={{ __html: FLAME_ICON }} />
                          Trending
                        </span>
                      ) : (
                        <span className="tag2">{c.type.replace(/s$/, "")}</span>
                      )}
                    </div>

                    <div className="bd">
                      <div className="tags">
                        {c.countries.concat(c.visas).slice(0, 3).map((t, idx) => (
                          <span key={idx}>{t}</span>
                        ))}
                      </div>

                      <h3>{c.name}</h3>
                      <p>{c.desc}</p>

                      <div className="stats">
                        <span>
                          <span dangerouslySetInnerHTML={{ __html: CLOCK_ICON }} />
                          About 60–90 seconds
                        </span>
                        <span>
                          <span dangerouslySetInnerHTML={{ __html: GIFT_ICON }} />
                          Free
                        </span>
                      </div>

                      <div className="btn primary">
                        <span>Start</span>
                        <span dangerouslySetInnerHTML={{ __html: ARROW_ICON }} />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Show More / Show Less Toggle Button */}
            {filteredCalculators.length > 12 && (
              <div className="grid-more-wrap">
                {visibleCount < filteredCalculators.length ? (
                  <button
                    type="button"
                    className="show-more-btn"
                    onClick={() => setVisibleCount((prev) => Math.min(prev + 12, filteredCalculators.length))}
                  >
                    <span>Show more calculators ({filteredCalculators.length - visibleCount} more)</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="show-more-btn secondary"
                    onClick={() => {
                      setVisibleCount(12);
                      const el = document.getElementById("calculators");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <span>Show less</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 rotate-180">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {filteredCalculators.length === 0 && (
              <p className="empty">
                {selType === "PDFs"
                  ? "No PDFs yet. We are adding them soon."
                  : "No match found. Try a different word or clear the filters."}
              </p>
            )}
          </div>
        </section>

        {/* 4. TESTIMONIALS SECTION (CONTINUOUS DUAL MARQUEE) */}
        <section className="sec alt" id="stories">
          <div className="wrap">
            <div className="thead">
              <div>
                <h2>What people say about TerraTern</h2>
                <p className="lead">What people tell us about our team and our calculators.</p>
              </div>
            </div>
          </div>

          <div className="marq" aria-label="Testimonials">
            {/* Row 1: Forward Marquee */}
            <div className="mrow" id="m1">
              <div className="mset">
                {rowA.map((r, i) => {
                  const ini = r.n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const bg = AV_COLORS[i % AV_COLORS.length];
                  return (
                    <figure key={r.id || i} className="tc" style={{ margin: 0 }}>
                      <span className="stars" aria-hidden="true">★★★★★</span>
                      <q>{r.q}</q>
                      <figcaption className="who">
                        <b className="av" style={{ background: bg }}>{ini}</b>
                        <div className="who-meta">
                          <strong className="who-name">{r.n}</strong>
                          <span className="who-loc">
                            <svg className="loc-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            <span>{r.c}</span>
                          </span>
                        </div>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>

              {/* Duplicate for seamless infinite loop */}
              <div className="mset" aria-hidden="true">
                {rowA.map((r, i) => {
                  const ini = r.n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const bg = AV_COLORS[i % AV_COLORS.length];
                  return (
                    <figure key={`dup-${r.id || i}`} className="tc" style={{ margin: 0 }}>
                      <span className="stars" aria-hidden="true">★★★★★</span>
                      <q>{r.q}</q>
                      <figcaption className="who">
                        <b className="av" style={{ background: bg }}>{ini}</b>
                        <div className="who-meta">
                          <strong className="who-name">{r.n}</strong>
                          <span className="who-loc">
                            <svg className="loc-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            <span>{r.c}</span>
                          </span>
                        </div>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>

            {/* Row 2: Reverse Marquee */}
            <div className="mrow rev" id="m2">
              <div className="mset">
                {rowB.map((r, i) => {
                  const ini = r.n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const bg = AV_COLORS[(i + 2) % AV_COLORS.length];
                  return (
                    <figure key={r.id || i} className="tc" style={{ margin: 0 }}>
                      <span className="stars" aria-hidden="true">★★★★★</span>
                      <q>{r.q}</q>
                      <figcaption className="who">
                        <b className="av" style={{ background: bg }}>{ini}</b>
                        <div className="who-meta">
                          <strong className="who-name">{r.n}</strong>
                          <span className="who-loc">
                            <svg className="loc-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            <span>{r.c}</span>
                          </span>
                        </div>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>

              {/* Duplicate for seamless infinite loop */}
              <div className="mset" aria-hidden="true">
                {rowB.map((r, i) => {
                  const ini = r.n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const bg = AV_COLORS[(i + 2) % AV_COLORS.length];
                  return (
                    <figure key={`dup2-${r.id || i}`} className="tc" style={{ margin: 0 }}>
                      <span className="stars" aria-hidden="true">★★★★★</span>
                      <q>{r.q}</q>
                      <figcaption className="who">
                        <b className="av" style={{ background: bg }}>{ini}</b>
                        <div className="who-meta">
                          <strong className="who-name">{r.n}</strong>
                          <span className="who-loc">
                            <svg className="loc-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
                              <circle cx="12" cy="10" r="2.5" />
                            </svg>
                            <span>{r.c}</span>
                          </span>
                        </div>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. NOT SURE SECTION (CONCISE & SIMPLE) */}
        <section className="consult" id="consult">
          <div className="wrap">
            <div className="cbox">
              <h2>Not sure which one fits you?</h2>
              <p className="cbox-sub-line">Talk to a TerraTern expert. It is free, and we will point you to the right route.</p>
              <button
                type="button"
                className="btn primary cursor-pointer"
                onClick={() => openCounsellingModal("Free 1:1 Consultation", "Talk to a TerraTern consultant to find the right country & visa route for you.")}
              >
                <span>Free consultation from TerraTern</span>
                <span dangerouslySetInnerHTML={{ __html: ARROW_ICON }} />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 6. GLOBAL FOOTER (LOCKED DESIGN) */}
      <footer className="site-foot">
        <div className="sf-in">
          <div className="sf-l">
            <a href="https://terratern.com/" target="_blank" rel="noopener">
              <img
                className="sf-logo"
                src="/images/terratern-footer-logo.png"
                alt="TerraTern"
              />
            </a>
            <h4 className="sf-h3">Follow us on</h4>
            <div className="sf-soc">
              <img
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIQAAAAYCAYAAAA74FWfAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAE7klEQVRoQ+2aP0wbVxzHv4661FXBqMkUVDudMB0MTSo8BDADSaRGCjZ0IKXCDK07xfbQIYEIWyQZmgE7U5LFRk3DUmNXYmjDYJcgFaTSOgvO1NoIplKVJCqrq9+z3/Vc7Luz/fyn0X0ky37ofL73ft/3+/cw4MxUHjo6RU7wDzo6uiB0jvGGfGDpPonI3c/hGLCiFtI7uxj7YhG5vQO8zjjsVsx7neizmmHqMKpdjtTmcyzF1hGNPYVIGmEvgzyHSK/egq3XjHpIbWYwcvUORGI5fQqmTiMsp0/C1PFW8fVmyTWHL4/YK7v3BxunMzk2Fs28z4XANac0V7Xfcdh74RjoYZ+D92IIhBIQRSPsVSKI/G9fQwSG9z6FCAI+F7zui5p2YTnIUNHYOvwL30AE7okhRL76jN3X6QkhtZWBFmgHxx/42DxGJm8jtfUcImiEvUpChhw24c0M4g/9ksKbCS3+fHEn1goZwDdzCemdHJZiG6iX6fFB9s7FQPd3jw8f81YcEk587Wd2rdMTRnL5Oua9LqQEe1AtkC25gB0DvXDYy9u0oiDoy4evjvBsJ9cSQYyNfgCRMV+EIBwDPdLCUvxOPb4Bc/epitdTzuCduYj+y7NIbe0wz9BXp4uvBd/CI4QjP0hjg9dQURAVy87EfR9CN6ekXdFsKF9QIrf3J7RSa9JVDr7Lroyek8SQ3TvAyOQddNk8zP2SB6HnMxQTP76GtLlqDX/1sPRtIZmlZwl4XRXFoOghksWJUyZKNwiEVyR3A+RZMkU4Rz+EufsdiIYSRyUsQz64XecR8E2o/r7avWqhq2hYEkP/R7PMm3ISa9tMOOnVQmjgImhEkqsF/mzu8SFWHSlRURDBcLzEvfBxwrqNZ5ndkuuSj2fR1/suRGLuVvYQRHRlg7nh6YkhBBQm2shd6Vt4xBZ8emIQobkpZvRgOIZobAPuLx+yvKFVyPMGPs4jr5hDVN2pJDGMXTiHsdGzbEwLICqLr4Xs/gGC4RWcGfQLr/O18N3aNnsPXnMy4ZFbXrxZyNrTmSxaCYmBb2T5+MWrv6v3EGqlF8FLqFZPnGEoxMhmY+owsk3RKQtLPDS0KkTIk2kDDP+Ge7uV5VN91sre/EQ9yd6w3dryiZNBqF/x+/qi0ORRK3xxyUtSIklrEQjH2N/Ik7YSWg95zsDHSpVR1R6iWVA7VS2PIG+1OPeJao7QSMFG7npYWUkNMHpx6JlCc1fxf6NqD9Es1IyYXL7BQpeaGAjezhZBV7EJ9Vfx+ShM/bp6W8qp6HnINVNbme9Etbm0E23rIaistSlULtWEh+y+GEEcvjyCzWphn+mwyj9ziZW8JApqTZeDytLEk+2SENvOtK0gUj9lhDXFEk9+gQjSmd1iYtbDkmnH5C1cuXC2opciAVFTiMpS6Xub2s4/2k4Q/z04KXeQQl0vejWC6MpT2N43wz0+qCksVDJIKPI9lgSVo8FQHI7l64g/8MPpWWSikLeEK0FiiN8veJBWlMbVUHLamVyerfvcgg6S+i/PQSSmt43SGQC5584O4zGRkPFfSEfgB4V3QaFCDh1O8SYY/Z/DjwonnvSMFPZ4eAuGYgjcE3f83Qh7lQiCSkpSf61dR3KH1J3L7b/e/yDjdp3H9MfDmoxBwqRFp4aQ1uNyrTTCXiWC0NFp27JTpzXogtCBnH8AZrkxNI9ZBfwAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAAABJRU5ErkJggg=="
                alt=""
                aria-hidden="true"
              />
              <a href="https://www.linkedin.com/company/terratern/" target="_blank" rel="noopener" aria-label="LinkedIn" style={{ left: 0 }}></a>
              <a href="https://www.youtube.com/@TerraTern" target="_blank" rel="noopener" aria-label="YouTube" style={{ left: "36px" }}></a>
              <a href="https://www.instagram.com/terratern" target="_blank" rel="noopener" aria-label="Instagram" style={{ left: "72px" }}></a>
              <a href="https://www.facebook.com/terraternwork" target="_blank" rel="noopener" aria-label="Facebook" style={{ left: "108px" }}></a>
            </div>

            <h4 className="sf-h3">Get in Touch With Us</h4>
            <p className="sf-q">Program &amp; Training queries:</p>
            <a className="sf-c" href="tel:+918062358632">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
              </svg>
              +91-8062358632
            </a>
            <a className="sf-c" href="mailto:info@terratern.com">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 7l9 6 9-6" />
              </svg>
              info@terratern.com
            </a>
          </div>

          <nav className="sf-cols" aria-label="Footer">
            <div className="sf-col sf-a">
              <h4>Company</h4>
              <a href="https://terratern.com/about-us/" target="_blank" rel="noopener">About Us</a>
              <a href="https://terratern.com/contact-us/" target="_blank" rel="noopener">Contact us</a>
              <a href="https://terratern.com/terms-and-condition/" target="_blank" rel="noopener">Terms and Conditions</a>
              <a href="https://terratern.com/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>
              <a href="https://terratern.com/refund-policy/" target="_blank" rel="noopener">Refund Policy</a>
              <h4 className="sf-sp">Testimonials</h4>
              <a href="https://terratern.com/success-stories/" target="_blank" rel="noopener">Success Stories</a>
              <a href="https://terratern.com/customer-reviews/" target="_blank" rel="noopener">Customer Reviews</a>
            </div>

            <div className="sf-col sf-b">
              <h4>Our Services</h4>
              <a href="https://terratern.com/service/" target="_blank" rel="noopener">All Products</a>
              <a href="https://terratern.com/healthcare/nursing-jobs-germany/" target="_blank" rel="noopener">Germany Healthcare</a>
              <a href="https://terratern.com/service/germany-opportunity-card/" target="_blank" rel="noopener">Germany Opportunity Card</a>
              <a href="https://terratern.com/service/express-entry-canada/" target="_blank" rel="noopener">Canada PR</a>
              <a href="https://terratern.com/service/skilled-independent-visa-australia-189/" target="_blank" rel="noopener">Australia PR</a>
            </div>

            <div className="sf-col sf-c2">
              <h4>Countries</h4>
              <a href="https://terratern.com/immigration/canada/" target="_blank" rel="noopener">Canada</a>
              <a href="https://terratern.com/immigration/germany/" target="_blank" rel="noopener">Germany</a>
              <a href="https://terratern.com/immigration/australia/" target="_blank" rel="noopener">Australia</a>
              <a href="https://terratern.com/immigration/uk/" target="_blank" rel="noopener">UK</a>
              <a href="https://terratern.com/immigration/sweden/" target="_blank" rel="noopener">Sweden</a>
              <a href="https://terratern.com/immigration/austria/" target="_blank" rel="noopener">Austria</a>
              <span>Portugal</span>
            </div>

            <div className="sf-col sf-d">
              <h4>Headquarters</h4>
              <p>Ground Floor, HustleHub 1703, 17th Cross Road, HSR Layout Sector 4, Karnataka 560102</p>
            </div>
          </nav>
        </div>
        <p className="sf-copy">©2024 TERRATERN PRIVATE LIMITED, All rights reserved.</p>
      </footer>

      {/* 7. HIGH-CONVERTING LEAD CAPTURE MODAL (.overlay / .modal) */}
      {isModalOpen && (
        <div className="modal-bg overlay" role="dialog" aria-modal="true" onClick={() => setIsModalOpen(false)}>
          <div className="mbox modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="mclose"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
            >
              ✕
            </button>
            {leadSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: "44px", color: "var(--ok)", marginBottom: "12px" }}>✓</div>
                <h3 style={{ fontSize: "20px", color: "var(--navy)", marginBottom: "8px" }}>
                  Request Received!
                </h3>
                <p style={{ fontSize: "14px", color: "var(--text)", lineHeight: 1.5, marginBottom: "20px" }}>
                  Thank you, <strong>{leadName || "Candidate"}</strong>! Our senior migration strategist will contact you via WhatsApp / phone within 2 business hours.
                </p>

                {selectedCalcForModal ? (
                  <a
                    href={appendUtms(selectedCalcForModal.url || `/p/${selectedCalcForModal.slug}`)}
                    className="btn primary"
                    style={{ width: "100%" }}
                  >
                    Proceed to {selectedCalcForModal.name} →
                  </a>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    style={{ width: "100%" }}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitLead}>
                <div className="mhead" style={{ marginBottom: "16px", paddingRight: "36px" }}>
                  <div className="flex items-center justify-between">
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--slate-900)" }}>{modalTitle}</h3>
                    <button
                      type="button"
                      className="mclose"
                      onClick={() => setIsModalOpen(false)}
                      aria-label="Close modal"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="msub" style={{ margin: "6px 0 0", fontSize: "13.5px", color: "var(--slate-600)" }}>{modalSubtitle}</p>
                </div>

                {leadError && (
                  <div style={{ padding: "8px 12px", background: "var(--danger50)", color: "var(--danger)", fontSize: "12.5px", borderRadius: "8px", marginBottom: "12px" }}>
                    {leadError}
                  </div>
                )}

                <div className="fld">
                  <label htmlFor="lead-name">Full Name *</label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    className="in"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                  />
                </div>

                <div className="fld">
                  <label htmlFor="lead-email">Email Address</label>
                  <input
                    id="lead-email"
                    type="email"
                    placeholder="name@example.com"
                    className="in"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                  />
                </div>

                <div className="fld">
                  <label htmlFor="lead-phone">Phone Number *</label>
                  <div className="phone">
                    <select
                      className="in"
                      value={leadDialCode}
                      onChange={(e) => setLeadDialCode(e.target.value)}
                      aria-label="Country dial code"
                    >
                      {COUNTRY_DIAL_CODES.map((dc) => (
                        <option key={dc.code} value={dc.code}>
                          {dc.flag} {dc.code}
                        </option>
                      ))}
                    </select>

                    <input
                      id="lead-phone"
                      type="tel"
                      required
                      placeholder="98765 43210"
                      className="in"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="consent">
                  <input
                    type="checkbox"
                    id="consent-check"
                    checked={leadConsent}
                    onChange={(e) => setLeadConsent(e.target.checked)}
                  />
                  <label htmlFor="consent-check">
                    I authorize TerraTern to send me assessment details and eligibility guidance via WhatsApp/Call.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="btn primary cursor-pointer"
                  style={{ width: "100%", height: "46px" }}
                >
                  {isSubmittingLead ? "Submitting..." : "Get Instant Free Advice →"}
                </button>

                <p className="safe">
                  🔒 Your information is 100% confidential and never shared.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 8. MINIMAL & CLASSY DESIGN SYSTEM CSS */}
      <style jsx global>{`
        :root {
          --primary: #185ADB;
          --primary-h: #0F45B3;
          --navy: #00215C;
          --ink: #0F172A;
          --text: #475569;
          --slate-900: #0F172A;
          --slate-800: #1E293B;
          --slate-700: #334155;
          --slate-600: #475569;
          --slate-500: #64748B;
          --slate-400: #94A3B8;
          --slate-200: #E2E8F0;
          --slate-100: #F1F5F9;
          --slate-50: #F8FAFC;
          --accent: #F59E0B;
          --accent-light: #FEF3C7;
          --accent-dark: #B45309;
          --danger: #EF4444;
          --danger50: #FEF2F2;
          --ok: #10B981;
          --ok50: #ECFDF5;
          --f-head: "Plus Jakarta Sans", "Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          --f-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: var(--f-body);
          color: var(--text);
          background: #FFFFFF;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
          overflow-y: auto;
        }

        button, input, select, textarea {
          font: inherit;
          color: inherit;
        }

        button {
          cursor: pointer;
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        .wrap {
          width: min(1200px, 100%);
          margin: 0 auto;
          padding: 0 clamp(16px, 4vw, 36px);
        }

        /* 1. Sleek, Minimal Glassmorphic Header */
        .top {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 66px;
          padding: 0 clamp(16px, 4vw, 44px);
          gap: 20px;
          background: rgba(255, 255, 255, 0.90);
          -webkit-backdrop-filter: blur(14px);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
          display: flex;
          align-items: center;
          justify-content: space-between;
          transition: background 0.2s, border-color 0.2s;
        }

        .brandlink {
          display: flex;
          align-items: center;
          flex: none;
        }

        .top .brand {
          height: 32px;
          width: auto;
          object-fit: contain;
          transition: opacity 0.15s;
        }

        .top .brand:hover {
          opacity: 0.92;
        }

        .nav {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: auto;
        }

        .nav > a {
          display: inline-flex;
          align-items: center;
          height: 38px;
          padding: 0 14px;
          border-radius: 8px;
          background: transparent;
          color: var(--slate-700);
          font-family: var(--f-head);
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }

        .nav > a:hover {
          background: var(--slate-100);
          color: var(--navy);
        }

        .hr {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: none;
        }

        .hcta {
          display: inline-flex;
          align-items: center;
          height: 38px;
          padding: 0 18px;
          border-radius: 9999px;
          border: 0;
          background: var(--navy);
          color: #fff;
          font-family: var(--f-head);
          font-weight: 600;
          font-size: 13.5px;
          box-shadow: 0 2px 6px rgba(0, 33, 92, 0.15);
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .hcta:hover {
          background: var(--primary);
          box-shadow: 0 4px 12px rgba(24, 90, 219, 0.25);
          transform: translateY(-1px);
        }

        .burger {
          display: none;
          width: 38px;
          height: 38px;
          border-radius: 8px;
          border: 1px solid var(--slate-200);
          background: #fff;
          color: var(--navy);
          place-items: center;
        }

        .burger svg {
          width: 20px;
          height: 20px;
        }

        @media (max-width: 900px) {
          .top { height: 56px; }
          .top .brand { height: 26px; }
          .burger { display: grid; }
          .nav {
            display: none;
            position: absolute;
            left: 0;
            right: 0;
            top: 100%;
            margin: 0;
            flex-direction: column;
            align-items: stretch;
            gap: 2px;
            padding: 10px 16px 16px;
            background: #fff;
            border-bottom: 1px solid var(--slate-200);
            box-shadow: 0 16px 30px rgba(0, 33, 92, 0.08);
          }
          .nav.open { display: flex; }
          .nav > a {
            height: 44px;
            width: 100%;
            justify-content: flex-start;
          }
        }

        /* 2. Refined, Minimal & Classy Hero Section */
        .hero {
          position: relative;
          overflow: hidden;
          background: radial-gradient(ellipse 60% 50% at 85% 35%, rgba(37, 92, 193, 0.08) 0%, transparent 70%),
                      linear-gradient(180deg, #F8FAFC 0%, #EFF6FF 50%, #F8FAFC 100%);
          padding: clamp(20px, 3vh, 32px) 0 clamp(22px, 3.5vh, 36px);
          border-bottom: 1px solid rgba(226, 232, 240, 0.8);
        }

        .hero:before {
          content: "";
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 1100px;
          height: 440px;
          background: radial-gradient(ellipse at center, rgba(24, 90, 219, 0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-in {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
          gap: clamp(20px, 3.5vw, 44px);
          align-items: center;
        }

        @media (max-width: 900px) {
          .hero-in {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .hl {
            display: contents;
          }

          .tpill {
            order: 1;
            align-self: flex-start;
          }

          .hero h1 {
            order: 2;
            margin-top: 4px;
            text-align: left !important;
            align-self: flex-start;
            width: 100%;
          }

          .hero h1 span {
            text-align: left !important;
          }

          .hero .sub {
            order: 3;
            margin-top: 0;
            text-align: left !important;
            align-self: flex-start;
            width: 100%;
          }

          .hero-calc-container {
            order: 4;
            margin: 8px 0 4px;
            width: 100%;
          }

          .hero-flags-container {
            order: 5;
            margin-top: 8px;
            max-width: 420px;
            width: 100%;
          }

          .cta-y {
            order: 6;
            margin-top: 10px;
            width: 100%;
            max-width: 420px;
            justify-content: center;
          }
        }

        .tpill {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9999px;
          padding: 5px 14px 5px 6px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
          font-family: var(--f-head);
          font-weight: 500;
          font-size: 12.5px;
          color: var(--slate-700);
          line-height: 1.2;
        }

        .avs { display: flex; }
        .avs b {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 9.5px;
          font-weight: 600;
          color: var(--navy);
          border: 1.5px solid #fff;
          margin-left: -6px;
        }
        .avs b:first-child { margin-left: 0; background: #FDE68A; }
        .avs b:nth-child(2) { background: #BAE6FD; }
        .avs b:nth-child(3) { background: #FECDD3; }

        .hero h1 {
          margin: 16px 0 0;
          font-family: var(--f-head);
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--slate-900);
          font-size: clamp(34px, 4.4vw, 54px);
          line-height: 1.12;
          text-align: left;
        }

        .hero h1 span {
          display: block;
          color: var(--primary);
          background: linear-gradient(135deg, #00215C 0%, #185ADB 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align: left;
        }

        .hero .sub {
          margin: 14px 0 0;
          font-size: clamp(14.5px, 1.4vw, 16.5px);
          line-height: 1.6;
          max-width: 540px;
          color: var(--slate-600);
          text-align: left;
        }

        .cta-y {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-top: 22px;
          background: var(--navy);
          color: #fff;
          border: 0;
          border-radius: 12px;
          padding: 8px 8px 8px 16px;
          font-family: var(--f-head);
          font-weight: 600;
          font-size: clamp(14px, 1.4vw, 15.5px);
          transition: all 0.18s ease;
          box-shadow: 0 4px 14px -2px rgba(0, 33, 92, 0.25);
        }

        .cta-y:hover {
          background: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 8px 20px -2px rgba(24, 90, 219, 0.35);
        }

        .cta-y svg {
          width: 20px;
          height: 20px;
          flex: none;
        }

        .cta-y em {
          font-style: normal;
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 11.5px;
          white-space: nowrap;
        }

        /* Hero Flags: 2 rows of 4 uniform-sized minimal chips */
        .hero-flags-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 22px;
          max-width: 520px;
          width: 100%;
        }

        .hero-flags-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          width: 100%;
        }

        .hero-flag-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          height: 36px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 9px;
          padding: 0 4px;
          font-family: var(--f-head);
          font-weight: 500;
          font-size: 11.5px;
          color: var(--slate-700);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: all 0.15s ease;
          white-space: nowrap;
          overflow: hidden;
        }

        .hero-flag-chip:hover {
          transform: translateY(-1px);
          border-color: var(--slate-400);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
          color: var(--navy);
        }

        .hero-flag-chip svg {
          width: 18px;
          height: 12px;
          border-radius: 2px;
          flex: none;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
        }

        @media (max-width: 480px) {
          .hero-flags-row {
            gap: 4px;
          }
          .hero-flag-chip {
            height: 32px;
            font-size: 10.5px;
            gap: 4px;
            padding: 0 2px;
          }
          .hero-flag-chip svg {
            width: 15px;
            height: 10px;
          }
        }

        /* Hero Right Panel: Spotlight Calculator (Thumbnail Expanded & Text Positioned Gracefully) */
        .hero-calc-container {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .hero-calc-container .hero-cc {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 48px -12px rgba(0, 33, 92, 0.12), 0 2px 8px rgba(0, 0, 0, 0.03);
          background: #FFFFFF;
        }

        .hero-calc-container .hero-cc:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 28px 56px -12px rgba(24, 90, 219, 0.20), 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .hero-cc .top2 {
          height: 310px;
          padding: 0 22px;
          position: relative;
        }

        .hero-cc .tag2 {
          top: 16px;
          right: 16px;
          padding: 6px 14px;
          font-size: 12px;
        }

        .hero-cc .fl {
          bottom: 14px;
          right: 18px;
          width: 30px;
          height: 21px;
        }

        .hero-cc .ico {
          width: 58px;
          height: 58px;
          border-radius: 16px;
          margin-bottom: -22px;
          box-shadow: 0 6px 18px rgba(0, 33, 92, 0.14);
        }

        .hero-cc .ico svg {
          width: 26px;
          height: 26px;
        }

        .hero-cc .bd {
          padding: 30px 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hero-cc .tags {
          margin-bottom: 2px;
        }

        .hero-cc h3 {
          font-size: 18px;
          letter-spacing: -0.015em;
          line-height: 1.35;
          margin: 0;
          color: #0F172A;
        }

        .hero-cc p {
          font-size: 13.5px;
          line-height: 1.55;
          color: #64748B;
          margin: 0;
        }

        .hero-cc .stats {
          font-size: 12.5px;
          gap: 16px;
          padding: 10px 0 0;
          border-top: 1px solid #F1F5F9;
        }

        .hero-cc .btn {
          height: 44px;
          font-size: 14.5px;
          font-weight: 700;
          border-radius: 12px;
          margin-top: 4px;
        }

        @media (max-width: 640px) {
          .hero-cc .top2 {
            height: 220px;
          }
          .hero-cc .bd {
            padding: 26px 18px 18px;
            gap: 10px;
          }
        }

        /* Hero Right Panel: Trending Spotlight Calculator */
        .trend {
          position: relative;
          z-index: 2;
          background: #FFFFFF;
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 20px 40px -15px rgba(0, 33, 92, 0.08), 0 1px 3px rgba(0,0,0,0.02);
          padding: 22px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.2s ease;
        }

        .trend:hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 48px -12px rgba(0, 33, 92, 0.12), 0 2px 6px rgba(0,0,0,0.03);
          border-color: #CBD5E1;
        }

        .trend-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .trend .bdg {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #FEF3C7;
          color: #92400E;
          font-family: var(--f-head);
          font-weight: 600;
          font-size: 11.5px;
          padding: 4px 10px;
          border-radius: 9999px;
          border: 1px solid #FDE68A;
        }

        .trend .bdg svg {
          width: 13px;
          height: 13px;
          color: #D97706;
        }

        .trend .capsule-pill {
          display: inline-flex;
          align-items: center;
          font-family: var(--f-head);
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--primary);
          background: #EFF6FF;
          padding: 3px 9px;
          border-radius: 9999px;
          border: 1px solid #DBEAFE;
        }

        .trend-thumb {
          position: relative;
          width: 100%;
          height: 122px;
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 14px rgba(0, 33, 92, 0.07);
        }

        .trend-thumb .trend-thumb-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 30%, rgba(255, 255, 255, 0.25), transparent 70%);
          pointer-events: none;
        }

        .trend-thumb .tico {
          position: relative;
          z-index: 2;
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.95);
          color: var(--primary);
          display: grid;
          place-items: center;
          box-shadow: 0 4px 12px rgba(0, 33, 92, 0.12);
        }

        .trend-thumb .tico svg {
          width: 28px;
          height: 28px;
        }

        .trend-thumb .trend-flag-badge {
          position: absolute;
          bottom: 10px;
          right: 12px;
          z-index: 3;
          width: 24px;
          height: 17px;
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 0 0 1.5px #fff, 0 2px 6px rgba(0, 0, 0, 0.2);
          display: flex;
        }

        .trend-thumb .trend-flag-badge svg {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .trend-thumb .trend-capsule-badge {
          position: absolute;
          top: 10px;
          right: 12px;
          z-index: 3;
          background: rgba(15, 23, 42, 0.85);
          color: #fff;
          font-family: var(--f-head);
          font-size: 10.5px;
          font-weight: 600;
          padding: 2.5px 9px;
          border-radius: 9999px;
          backdrop-filter: blur(6px);
        }

        .trend h3 {
          margin: 0;
          font-family: var(--f-head);
          font-weight: 700;
          font-size: clamp(20px, 2.2vw, 24px);
          letter-spacing: -0.015em;
          line-height: 1.25;
          color: var(--slate-900);
        }

        .trend p {
          margin: 0;
          font-size: 13.5px;
          color: var(--slate-600);
          line-height: 1.5;
        }

        .trend .tags {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }

        .trend .tags span {
          font-size: 11.5px;
          font-family: var(--f-head);
          font-weight: 500;
          background: var(--slate-100);
          color: var(--slate-700);
          border: 1px solid rgba(0, 0, 0, 0.04);
          padding: 3px 9px;
          border-radius: 6px;
        }

        .trend-meta-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding-top: 8px;
          border-top: 1px solid var(--slate-100);
          font-size: 12px;
          color: var(--slate-500);
          flex-wrap: wrap;
        }

        .trend-meta-row span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .trend-meta-row svg {
          width: 13px;
          height: 13px;
          color: var(--primary);
        }

        .trend .btn {
          width: 100%;
          height: 44px;
          font-size: 14.5px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 10px;
          background: var(--navy);
          color: #fff;
          margin-top: 2px;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .trend .btn:hover {
          background: var(--primary);
        }

        .trend .btn svg {
          width: 16px;
          height: 16px;
          transition: transform 0.15s;
        }

        .trend .btn:hover svg {
          transform: translateX(3px);
        }

        .trend-trust-micro {
          font-size: 11.5px;
          color: var(--slate-500);
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: -2px;
        }

        /* 3. Calculators Section */
        .sec {
          padding: clamp(20px, 3vh, 36px) 0;
        }

        .sec h2 {
          margin: 0;
          font-family: var(--f-head);
          font-weight: 700;
          letter-spacing: -0.025em;
          color: var(--slate-900);
          font-size: clamp(24px, 3vw, 34px);
          line-height: 1.15;
        }

        .sec .lead {
          margin: 6px 0 0;
          font-size: clamp(14px, 1.4vw, 16px);
          color: var(--slate-600);
          max-width: 600px;
        }

        .sec.alt {
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          border-bottom: 1px solid #E2E8F0;
        }

        /* Streamlined Search, Dropdowns & Category Pills */
        .fbar-wrap {
          margin: 14px 0 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fbar {
          display: grid;
          grid-template-columns: minmax(240px, 2.2fr) minmax(130px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr) auto;
          gap: 10px;
          align-items: end;
        }

        .sbox {
          display: flex;
          align-items: center;
          gap: 9px;
          height: 44px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 0 12px;
          color: var(--slate-500);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .sbox:focus-within {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(24, 90, 219, 0.12);
        }

        .sbox svg {
          width: 18px;
          height: 18px;
          flex: none;
        }

        .sbox input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          font-size: 14px;
          color: var(--slate-900);
        }

        .dd {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .dd span {
          font-size: 11.5px;
          font-weight: 500;
          color: var(--slate-700);
          padding-left: 2px;
        }

        .dd select {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          height: 44px;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 0 34px 0 12px;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E") no-repeat right 10px center/16px;
          font-size: 13.5px;
          color: var(--slate-700);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .dd select:hover { border-color: var(--slate-400); }
        .dd select:focus {
          outline: 0;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(24, 90, 219, 0.12);
        }

        .clr-btn {
          height: 44px;
          padding: 0 14px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          color: var(--slate-600);
          font-family: var(--f-head);
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .clr-btn:hover {
          background: var(--slate-100);
          color: var(--slate-900);
          border-color: var(--slate-400);
        }

        /* Minimal Horizontal Category Pills */
        .fbar-pills {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          padding-top: 4px;
        }

        .fbar-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 9999px;
          font-family: var(--f-head);
          font-size: 12.5px;
          font-weight: 600;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          color: var(--slate-600);
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
        }

        .fbar-pill:hover {
          background: var(--slate-50);
          color: var(--slate-900);
          border-color: var(--slate-400);
        }

        .fbar-pill.active {
          background: var(--navy);
          color: #fff;
          border-color: var(--navy);
          box-shadow: 0 2px 6px rgba(0, 33, 92, 0.18);
        }

        .fbar-pill .pill-cnt {
          font-size: 10.5px;
          padding: 1px 6px;
          border-radius: 9999px;
          background: rgba(0, 0, 0, 0.06);
          font-family: monospace;
        }

        .fbar-pill.active .pill-cnt {
          background: rgba(255, 255, 255, 0.22);
          color: #fff;
        }

        .fbar-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 2px 0;
        }

        .count {
          margin: 0;
          font-size: 13px;
          color: var(--slate-500);
        }

        .filter-badge {
          display: inline-flex;
          align-items: center;
          background: #EFF6FF;
          color: var(--primary);
          font-size: 11.5px;
          font-weight: 600;
          padding: 3px 9px;
          border-radius: 9999px;
          border: 1px solid #DBEAFE;
        }

        @media (max-width: 980px) {
          .fbar {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }
          .sbox {
            grid-column: 1 / -1;
            height: 44px;
          }
          .clr-btn {
            grid-column: 1 / -1;
            justify-self: start;
            height: 38px;
          }
        }

        @media (max-width: 600px) {
          .fbar {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 6px;
          }
          .sbox {
            grid-column: 1 / -1;
            height: 40px;
          }
          .dd span {
            font-size: 11px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .dd select {
            height: 38px;
            font-size: 12px;
            padding: 0 20px 0 6px;
            background-size: 12px;
            background-position: right 4px center;
          }
        }

        .empty {
          margin: 16px 0 0;
          padding: 40px 20px;
          text-align: center;
          background: #FFFFFF;
          border: 1px dashed #CBD5E1;
          border-radius: 16px;
          color: var(--slate-600);
          font-family: var(--f-head);
          font-weight: 500;
          font-size: 14px;
        }

        /* 4. Four-Column Minimal & Classy Grid Cards */
        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 14px;
        }

        @media (max-width: 1080px) {
          .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 800px) {
          .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 520px) {
          .grid { grid-template-columns: 1fr; }
        }

        .cc {
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 2px 6px -1px rgba(0, 0, 0, 0.03);
          transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }

        .cc:hover {
          transform: translateY(-4px);
          border-color: #CBD5E1;
          box-shadow: 0 16px 32px -8px rgba(0, 33, 92, 0.09), 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .cc .top2 {
          position: relative;
          height: 104px;
          display: flex;
          align-items: flex-end;
          padding: 0 16px;
          overflow: visible;
        }

        .top2-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.40) 0%, transparent 60%);
          pointer-events: none;
        }

        .cc .ico {
          position: relative;
          z-index: 2;
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: #FFFFFF;
          color: var(--primary);
          display: grid;
          place-items: center;
          margin-bottom: -16px;
          box-shadow: 0 4px 14px rgba(0, 33, 92, 0.12);
          border: 1px solid rgba(0, 0, 0, 0.04);
        }

        .cc .ico svg {
          width: 24px;
          height: 24px;
        }

        .cc .fl {
          position: absolute;
          right: 12px;
          bottom: 10px;
          z-index: 1;
          width: 26px;
          height: 18px;
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 0 0 1.5px #fff, 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .cc .fl svg {
          display: block;
          width: 100%;
          height: 100%;
        }

        .cc .tag2 {
          position: absolute;
          right: 12px;
          top: 12px;
          z-index: 2;
          background: rgba(255, 255, 255, 0.94);
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          color: var(--navy);
          font-family: var(--f-head);
          font-weight: 600;
          font-size: 11px;
          padding: 3px 9px;
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.05);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          display: inline-flex;
          align-items: center;
          gap: 3.5px;
        }

        .cc .tag2.hot {
          background: #FEF3C7;
          color: #92400E;
          border-color: #FDE68A;
        }

        .cc .tag2.hot svg {
          width: 11px;
          height: 11px;
          color: #D97706;
        }

        .cc .bd {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 24px 16px 16px;
          flex: 1;
        }

        .cc .tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .cc .tags span {
          font-size: 10.5px;
          font-family: var(--f-head);
          font-weight: 500;
          background: #F1F5F9;
          color: var(--slate-600);
          padding: 2px 7px;
          border-radius: 5px;
        }

        .cc h3 {
          margin: 0;
          font-family: var(--f-head);
          font-weight: 700;
          font-size: 15.5px;
          letter-spacing: -0.015em;
          color: var(--slate-900);
          line-height: 1.3;
        }

        .cc p {
          margin: 0;
          font-size: 12.5px;
          color: var(--slate-500);
          line-height: 1.45;
          flex: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .cc .stats {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: var(--slate-400);
          padding-top: 2px;
        }

        .cc .stats span {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .cc .stats svg {
          width: 12px;
          height: 12px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 44px;
          padding: 0 20px;
          border-radius: 10px;
          border: 0;
          font-family: var(--f-head);
          font-weight: 600;
          font-size: 14px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .btn.primary {
          background: var(--navy);
          color: #fff;
        }

        .btn.primary:hover {
          background: var(--primary);
        }

        .cc .btn {
          height: 38px;
          font-size: 13px;
          font-weight: 600;
          width: 100%;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          color: var(--navy);
          transition: all 0.15s ease;
        }

        .cc:hover .btn {
          background: var(--navy);
          color: #fff;
          border-color: var(--navy);
        }

        .cc .btn svg {
          width: 14px;
          height: 14px;
          transition: transform 0.15s ease;
        }

        .cc:hover .btn svg {
          transform: translateX(3px);
        }

        
        .grid-more-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 28px;
        }

        .show-more-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          background: #FFFFFF;
          border: 1.5px solid #CBD5E1;
          border-radius: 9999px;
          font-family: var(--f-head);
          font-size: 13.5px;
          font-weight: 700;
          color: var(--navy);
          cursor: pointer;
          transition: all 0.18s ease;
          box-shadow: 0 2px 6px rgba(0, 33, 92, 0.04);
        }

        .show-more-btn:hover {
          background: #F8FAFC;
          border-color: #94A3B8;
          color: var(--primary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 33, 92, 0.08);
        }

        .show-more-btn.secondary {
          background: #F1F5F9;
          border-color: #E2E8F0;
          color: var(--slate-600);
        }

        .show-more-btn.secondary:hover {
          background: #E2E8F0;
          color: var(--slate-900);
        }

        .show-more-btn svg {
          width: 16px;
          height: 16px;
          transition: transform 0.2s ease;
        }

        /* 5. Testimonials Marquee */
        .thead {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .marq {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 14px;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
        }

        .mrow {
          display: flex;
          width: max-content;
          animation: mq 75s linear infinite;
        }

        .mrow.rev {
          animation-direction: reverse;
          animation-duration: 85s;
        }

        .marq:hover .mrow {
          animation-play-state: paused;
        }

        .mset {
          display: flex;
          gap: 14px;
          padding-right: 14px;
        }

        @keyframes mq {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .mrow .tc {
          flex: 0 0 320px;
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
        }

        .tc .stars {
          color: var(--accent);
          letter-spacing: 1.5px;
          font-size: 14px;
          line-height: 1;
        }

        .tc q {
          quotes: none;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--slate-700);
          flex: 1;
        }

        .tc .who {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: auto;
          padding-top: 12px;
          border-top: 1px solid #F1F5F9;
        }

        .tc .who b.av {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-family: var(--f-head);
          font-weight: 700;
          font-size: 13px;
          color: var(--navy);
          flex: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .tc .who-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          overflow: hidden;
        }

        .tc .who-name {
          font-family: var(--f-head);
          font-weight: 700;
          font-size: 14px;
          color: var(--slate-900);
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tc .who-loc {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-style: normal;
          color: var(--slate-500);
          font-size: 12px;
          font-weight: 500;
          line-height: 1.3;
        }

        .tc .who-loc .loc-pin {
          width: 12px !important;
          height: 12px !important;
          min-width: 12px !important;
          min-height: 12px !important;
          max-width: 12px !important;
          max-height: 12px !important;
          flex: none !important;
          stroke: #64748B;
          display: inline-block;
          vertical-align: middle;
        }

        /* 6. Classy Consultation Section */
        .consult {
          padding: clamp(18px, 3vh, 32px) 0;
        }

        .cbox {
          background: linear-gradient(135deg, #00215C 0%, #185ADB 100%);
          border-radius: 20px;
          box-shadow: 0 16px 36px -10px rgba(0, 33, 92, 0.25);
          text-align: center;
          padding: clamp(20px, 3vw, 32px) clamp(16px, 3vw, 32px);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          color: #fff;
        }

        .cbox h2 {
          margin: 0;
          font-family: var(--f-head);
          font-weight: 700;
          font-size: clamp(22px, 2.5vw, 28px);
          color: #FFFFFF;
          letter-spacing: -0.02em;
        }

        .cbox p, .cbox-sub-line {
          margin: 0;
          max-width: none;
          white-space: nowrap;
          font-size: clamp(14px, 1.4vw, 16px);
          color: #E2E8F0;
          line-height: 1.5;
        }

        @media (max-width: 680px) {
          .cbox p, .cbox-sub-line {
            white-space: normal;
          }
        }

        .cbox .btn {
          height: 44px;
          padding: 0 28px;
          font-size: 14.5px;
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 10px;
          background: #FFFFFF;
          color: var(--navy);
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
        }

        .cbox .btn:hover {
          background: #F8FAFC;
          transform: translateY(-1px);
        }

        .cbox .btn svg {
          width: 16px;
          height: 16px;
          transition: transform 0.15s;
        }

        .cbox .btn:hover svg {
          transform: translateX(3px);
        }

        /* 7. Footer (Exact Locked Footer) */
        .site-foot {
          background: #00215C;
          color: #fff;
          font-family: var(--f-body);
        }

        .sf-in {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: minmax(260px, 5fr) 7fr;
          gap: 24px 36px;
          padding: 38px clamp(20px, 5vw, 60px) 24px;
        }

        .sf-logo {
          display: block;
          width: 200px;
          height: auto;
          margin-bottom: 14px;
        }

        .sf-h3 {
          margin: 0 0 8px;
          font-family: var(--f-body);
          font-weight: 500;
          font-size: 16px;
          color: #fff;
        }

        .sf-soc {
          position: relative;
          width: 132px;
          height: 24px;
          margin-bottom: 18px;
        }

        .sf-soc img {
          display: block;
          width: 132px;
          height: 24px;
        }

        .sf-soc a {
          position: absolute;
          top: 0;
          width: 24px;
          height: 24px;
        }

        .sf-q {
          margin: 0 0 6px;
          font-weight: 500;
          text-decoration: underline;
          font-size: 14.5px;
        }

        .sf-c {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
          text-decoration: none;
          font-weight: 500;
          font-size: 15.5px;
          line-height: 24px;
        }

        .sf-c:hover {
          text-decoration: underline;
        }

        .sf-cols {
          display: grid;
          grid-template-columns: 1.25fr 1fr 0.85fr 1.2fr;
          gap: 28px;
        }

        .sf-col h4 {
          margin: 0 0 16px;
          font-family: var(--f-body);
          font-weight: 500;
          font-size: 19px;
          line-height: 1.15;
          color: #fff;
        }

        .sf-col h4.sf-sp {
          margin-top: 26px;
        }

        .sf-col a, .sf-col span {
          display: block;
          color: #fff;
          text-decoration: none;
          font-size: 14.5px;
          line-height: 1.3;
          margin-bottom: 8px;
          opacity: 0.95;
        }

        .sf-col a:hover {
          text-decoration: underline;
        }

        .sf-col p {
          margin: 0;
          font-size: 14.5px;
          line-height: 1.3;
        }

        .sf-copy {
          margin: 0 auto;
          max-width: 1240px;
          border-top: 1px solid rgba(255, 255, 255, 0.12);
          padding: 20px 16px 22px;
          text-align: center;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.80);
        }

        @media (max-width: 900px) {
          .sf-in { grid-template-columns: 1fr; padding-top: 40px; }
          .sf-cols { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 480px) {
          .sf-cols { grid-template-columns: 1fr 1fr; gap: 20px 16px; }
          .sf-logo { width: 180px; }
        }

        /* 8. Lead Capture Modal (Unified & Clean) */
        .modal-bg, .overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow-y: auto;
        }

        .mbox, .modal {
          background: #FFFFFF;
          width: min(480px, 100%);
          border-radius: 20px;
          padding: 28px 24px 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          max-height: 90vh;
          overflow-y: auto;
        }

        .mclose {
          position: absolute;
          top: 16px;
          right: 16px;
          background: var(--slate-100);
          border: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--slate-500);
          font-size: 16px;
          transition: all 0.15s;
        }

        .mclose:hover {
          background: var(--slate-200);
          color: var(--slate-900);
        }

        .mbox h3 {
          margin: 0 0 6px;
          font-family: var(--f-head);
          font-size: 20px;
          font-weight: 700;
          color: var(--slate-900);
          letter-spacing: -0.015em;
        }

        .mbox p.sub {
          margin: 0 0 20px;
          font-size: 13.5px;
          color: var(--slate-600);
          line-height: 1.45;
        }

        .fld {
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .fld label {
          font-size: 12px;
          font-weight: 600;
          color: var(--slate-700);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .in {
          height: 42px;
          border: 1px solid #CBD5E1;
          border-radius: 10px;
          padding: 0 12px;
          font-size: 14px;
          color: var(--slate-900);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .in:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(24, 90, 219, 0.12);
        }

        .phone {
          display: flex;
          gap: 8px;
        }

        .phone select {
          width: 100px;
          flex-shrink: 0;
        }

        .phone input {
          flex: 1;
        }

        .consent {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 16px;
          font-size: 12px;
          color: var(--slate-600);
          line-height: 1.4;
        }

        .consent input {
          margin-top: 3px;
        }

        .safe {
          margin: 12px 0 0;
          text-align: center;
          font-size: 11.5px;
          color: var(--slate-400);
        }
      `}</style>
    </div>
  );
}
