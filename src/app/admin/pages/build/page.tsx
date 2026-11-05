'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { generateUniqueSlug, generatePageKey } from '@/lib/utils';
import { Asset } from '@/lib/types';
import { VibePageConfig, generateHeuristicPage, synthesizeCustomHtml } from '@/lib/vibe-engine';
import { VibePagePreview } from '@/components/vibe/VibePagePreview';
import {
  Sparkles,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  Send,
  RefreshCw,
  Share2,
  FileText,
  Sliders,
  Award,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  SlidersHorizontal,
  Bot,
  Palette,
  CheckCircle2,
  PanelLeftClose,
  PanelLeftOpen,
  Undo2,
  Redo2,
  History,
  Code,
  GripVertical,
  Save,
  AlertCircle,
  Clock,
  Terminal,
  Columns,
  Layers,
  Link2,
  Code2,
  Globe,
  Paperclip,
  Upload,
  FileCode,
  Trash2,
  X,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface ConfigSnapshot {
  id: string;
  timestamp: string;
  description: string;
  config: VibePageConfig;
}

const BLANK_PAGE_CONFIG: VibePageConfig = {
  name: 'New Landing Page',
  page_type: 'custom',
  headline: 'Transform Social Media Traffic Into High-Intent Consultations',
  subtitle: 'Prompt our Vibe AI engine or upload code to build bespoke immigration calculators, quizzes, and landing pages with universal lead tracking.',
  theme_accent: 'blue',
  questions: [],
  qualification_threshold: 0,
  badge_text: 'Live 2026 Assessment',
  cta_text: 'Claim Strategy Consultation',
  slug_suggestion: 'global-mobility-assessment',
  keyword_suggestion: 'CONSULT',
  custom_html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TerraTern Global Mobility | Assessment & Strategy</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
  </style>
</head>
<body class="bg-gradient-to-b from-slate-50 via-white to-slate-100 min-h-screen text-slate-800 antialiased flex flex-col justify-between">
  <!-- Navigation Header -->
  <header class="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-[#00215C] text-white font-extrabold text-sm flex items-center justify-center shadow-md">
        TT
      </div>
      <div>
        <span class="font-extrabold text-sm text-[#00215C] tracking-tight block">TerraTern</span>
        <span class="text-[10px] text-slate-500 font-medium block leading-none">Global Mobility Counsel</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Admissions Open 2026</span>
      </span>
    </div>
  </header>

  <!-- Main Hero & Lead Capture Section -->
  <main class="max-w-2xl mx-auto w-full px-4 py-8 sm:py-12 my-auto">
    <div class="text-center mb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#255CC1] text-xs font-bold mb-3 shadow-sm">
        <span>✨ AI-Ready Vibe Studio Page</span>
      </div>
      <h1 class="text-2xl sm:text-4xl font-black text-[#00215C] tracking-tight leading-tight mb-3">
        Evaluate Your Global Mobility Pathway
      </h1>
      <p class="text-sm sm:text-base text-slate-600 max-w-lg mx-auto leading-relaxed">
        Get an accurate qualification evaluation for Canada, Germany, Australia, UK, and Dubai PR programs.
      </p>
    </div>

    <!-- TerraTern Universal Lead Capture Card -->
    <div class="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 p-6 sm:p-8">
      <div class="mb-5 pb-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 class="text-base font-bold text-[#00215C]">Request Immediate Consultation</h2>
          <p class="text-xs text-slate-500 mt-0.5">Submit your details to connect with a senior licensed advisor.</p>
        </div>
        <span class="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
          Zero Spam
        </span>
      </div>

      <form id="terrateern-lead-form" class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Rahul Sharma"
            class="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Mobile Number (India +91) *
          </label>
          <input
            type="tel"
            name="phone"
            required
            placeholder="9876543210"
            class="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="rahul@example.com"
            class="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
          />
        </div>

        <label class="flex items-start gap-2.5 text-xs text-slate-500 pt-1 cursor-pointer">
          <input type="checkbox" name="consent" checked required class="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
          <span>I agree to receive my assessment roadmap & strategy consultation via WhatsApp and Email.</span>
        </label>

        <div class="pt-2">
          <button
            type="submit"
            class="w-full py-3.5 px-6 bg-[#00215C] hover:bg-[#255CC1] active:scale-[0.99] text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-900/15 flex items-center justify-center gap-2"
          >
            <span>Claim Strategy Consultation & Assessment</span>
            <span>&rarr;</span>
          </button>
        </div>
      </form>
    </div>

    <!-- Trust Proof Grid -->
    <div class="mt-8 grid grid-cols-3 gap-3 text-center border-t border-slate-200/80 pt-6 text-xs text-slate-500">
      <div>
        <span class="block text-lg font-black text-[#00215C]">5,000+</span>
        <span class="text-[11px]">Visas Approved</span>
      </div>
      <div>
        <span class="block text-lg font-black text-[#00215C]">98.4%</span>
        <span class="text-[11px]">Qualification Accuracy</span>
      </div>
      <div>
        <span class="block text-lg font-black text-[#00215C]">Licensed</span>
        <span class="text-[11px]">MARA & German Counsel</span>
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer class="w-full py-5 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
    <p>&copy; 2026 TerraTern Global Mobility. All rights reserved. &bull; <a href="#" class="underline">Privacy Policy</a></p>
  </footer>
</body>
</html>`,
};

export default function VibeStudioPage() {
  const router = useRouter();
  const { canEdit, sidebarCollapsed, toggleSidebar } = useAdmin();
  const supabase = createClient();

  // Root canvas container ref for draggable splitter
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Draft Config
  const [config, setConfig] = useState<VibePageConfig>(() => BLANK_PAGE_CONFIG);

  // Version History / Revert System
  const [history, setHistory] = useState<ConfigSnapshot[]>(() => [
    {
      id: 'snap_0',
      timestamp: 'Initial',
      description: 'Clean Canvas',
      config: JSON.parse(JSON.stringify(BLANK_PAGE_CONFIG)),
    },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Layout & Splitter States
  const [promptWidth, setPromptWidth] = useState<number>(42); // 42% default
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Builder Left Panel Tab: 'ai' | 'upload' | 'code' | 'editor'
  const [studioTab, setStudioTab] = useState<'ai' | 'upload' | 'code' | 'editor'>('ai');

  // Preview Mode & Simulation Reset
  const [viewDevice, setViewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewKey, setPreviewKey] = useState(1);

  // Code Editor: 'html' | 'json'
  const [codeSubTab, setCodeSubTab] = useState<'html' | 'json'>('html');
  const [htmlCode, setHtmlCode] = useState(() => config.custom_html || synthesizeCustomHtml(config));
  const [jsonCode, setJsonCode] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  // File Upload State & Ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    size: number;
    content: string;
  } | null>(null);

  // Prompt & Chat History
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<
    { role: 'user' | 'assistant'; content: string; time: string }[]
  >([
    {
      role: 'assistant',
      content:
        'Welcome to TerraTern Vibe Studio! Describe any landing page, interactive calculator, or qualification portal you want to build. You can also attach files or paste external code.',
      time: 'Just now',
    },
  ]);

  const [suggestions, setSuggestions] = useState<string[]>([
    'Build an interactive Canada Express Entry CRS Points calculator with interactive sliders',
    'Create a Dubai 10-Year Golden Visa eligibility assessment with salary & investment checks',
    'Create a Germany Opportunity Card (§ 20a Chancenkarte) points evaluation portal',
    'Build a US EB-5 Immigrant Investor high-ticket consultation landing page',
    'Add WhatsApp floating quick-connect button and 2-step lead capture',
  ]);

  // Metadata Settings
  const [customSlug, setCustomSlug] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [pdfAssetId, setPdfAssetId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);

  // Publishing, Saving & Connected Links State
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [linksModalTab, setLinksModalTab] = useState<'live' | 'embed' | 'api'>('live');
  const [publishedPage, setPublishedPage] = useState<{
    id?: string;
    slug: string;
    page_key: string;
    name?: string;
    live_url?: string;
    embed_script?: string;
    social_tracked_url?: string;
    status?: string;
  } | null>(null);

  // Campaign UTM Builder feature state
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedUtmLink, setCopiedUtmLink] = useState(false);
  const [copiedEmbedScript, setCopiedEmbedScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [previewCopied, setPreviewCopied] = useState(false);

  const getCustomCampaignUrl = (baseUrl: string) => {
    try {
      const url = new URL(baseUrl);
      if (utmSource.trim()) url.searchParams.set('utm_source', utmSource.trim().toLowerCase());
      if (utmMedium.trim()) url.searchParams.set('utm_medium', utmMedium.trim().toLowerCase());
      if (utmCampaign.trim()) url.searchParams.set('utm_campaign', utmCampaign.trim().toLowerCase());
      if (utmTerm.trim()) url.searchParams.set('utm_term', utmTerm.trim());
      if (utmContent.trim()) url.searchParams.set('utm_content', utmContent.trim());
      return url.toString();
    } catch {
      const params = new URLSearchParams();
      if (utmSource.trim()) params.set('utm_source', utmSource.trim().toLowerCase());
      if (utmMedium.trim()) params.set('utm_medium', utmMedium.trim().toLowerCase());
      if (utmCampaign.trim()) params.set('utm_campaign', utmCampaign.trim().toLowerCase());
      if (utmTerm.trim()) params.set('utm_term', utmTerm.trim());
      if (utmContent.trim()) params.set('utm_content', utmContent.trim());
      const qs = params.toString();
      return qs ? `${baseUrl}?${qs}` : baseUrl;
    }
  };

  const handleResetUtm = () => {
    setUtmSource('');
    setUtmMedium('');
    setUtmCampaign('');
    setUtmTerm('');
    setUtmContent('');
  };

  // Sync JSON & HTML code when config updates
  useEffect(() => {
    setJsonCode(JSON.stringify(config, null, 2));
    setJsonError(null);
    if (config.custom_html) {
      setHtmlCode(config.custom_html);
    } else {
      const generated = synthesizeCustomHtml(config);
      setHtmlCode(generated);
      setConfig((prev) => ({ ...prev, custom_html: generated }));
    }
  }, [config.name, config.headline, config.questions, config.custom_html]);

  // Load existing assets and slugs
  useEffect(() => {
    async function loadInitial() {
      try {
        const { data: pagesData } = await supabase.from('pages').select('slug');
        if (pagesData) setExistingSlugs(pagesData.map((p) => p.slug));

        const { data: assetsData } = await supabase
          .from('assets')
          .select('*')
          .order('created_at', { ascending: false });
        if (assetsData) setAssets(assetsData);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    }
    loadInitial();
  }, []);

  // Update slug and keyword defaults when config changes
  useEffect(() => {
    if (!customSlug && config.slug_suggestion) {
      setCustomSlug(config.slug_suggestion);
    }
    if (!customKeyword && config.keyword_suggestion) {
      setCustomKeyword(config.keyword_suggestion);
    }
  }, [config]);

  // Helper to append a snapshot into history
  const recordSnapshot = (newConfig: VibePageConfig, description: string) => {
    const snapshot: ConfigSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      description,
      config: JSON.parse(JSON.stringify(newConfig)),
    };
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), snapshot]);
    setHistoryIndex((prev) => prev + 1);
  };

  // Undo (Ctrl+Z)
  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIdx = historyIndex - 1;
      setHistoryIndex(targetIdx);
      setConfig(history[targetIdx].config);
      setPreviewKey((k) => k + 1);
    }
  };

  // Redo (Ctrl+Y)
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIdx = historyIndex + 1;
      setHistoryIndex(targetIdx);
      setConfig(history[targetIdx].config);
      setPreviewKey((k) => k + 1);
    }
  };

  // Revert to specific version
  const handleRevertTo = (index: number) => {
    if (index >= 0 && index < history.length) {
      setHistoryIndex(index);
      setConfig(history[index].config);
      setPreviewKey((k) => k + 1);
      setIsHistoryModalOpen(false);
    }
  };

  // Reset to initial baseline template
  const handleResetInitial = () => {
    if (history.length > 0) {
      handleRevertTo(0);
    }
  };

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Draggable Splitter mouse event listeners
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidthPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (newWidthPercent >= 22 && newWidthPercent <= 75) {
        setPromptWidth(Math.round(newWidthPercent));
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // File Processing (HTML, JSX, TSX, Markdown, Text, PDF, JSON)
  const processFile = (file: File) => {
    const reader = new FileReader();
    const isText =
      file.type.startsWith('text/') ||
      /\.(html|htm|jsx|tsx|vue|js|ts|json|txt|md|svg|csv)$/i.test(file.name);

    if (isText) {
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setAttachedFile({
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          content,
        });
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setAttachedFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          content,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Call In-Portal AI Engine (Lovable & Google AI Studio style)
  const handlePromptSubmit = async (userPrompt: string, fileToAttach = attachedFile) => {
    const trimmed = userPrompt.trim();
    const effectivePrompt =
      trimmed ||
      (fileToAttach
        ? `Adapt and convert this attached file (${fileToAttach.name}) into a high-converting TerraTern landing page with interactive elements and universal lead capture.`
        : '');

    if (!effectivePrompt || isGenerating) return;

    setIsGenerating(true);
    setGenerationStep(
      fileToAttach
        ? `Processing attached file "${fileToAttach.name}" & requirements...`
        : 'Analyzing prompt requirements...'
    );
    setPromptText('');

    const displayContent = fileToAttach
      ? `[📎 Attached: ${fileToAttach.name} (${(fileToAttach.size / 1024).toFixed(1)} KB)]\n${effectivePrompt}`
      : effectivePrompt;

    const updatedHistory = [
      ...chatHistory,
      {
        role: 'user' as const,
        content: displayContent,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatHistory(updatedHistory);

    try {
      setTimeout(() => setGenerationStep('Synthesizing bespoke layout & interactive logic...'), 400);
      setTimeout(() => setGenerationStep('Injecting universal lead attribution & Tailwind styles...'), 900);

      const res = await fetch('/api/v1/admin/studio/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: effectivePrompt,
          currentConfig: config,
          history: updatedHistory.map((h) => ({ role: h.role, content: h.content })),
          attachedFile: fileToAttach
            ? {
                name: fileToAttach.name,
                type: fileToAttach.type,
                content: fileToAttach.content,
              }
            : null,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.config) {
        setConfig(data.config);
        recordSnapshot(
          data.config,
          `AI Prompt: "${effectivePrompt.substring(0, 32)}${effectivePrompt.length > 32 ? '...' : ''}"`
        );
        if (data.config.slug_suggestion) setCustomSlug(data.config.slug_suggestion);
        if (data.config.keyword_suggestion) {
          setCustomKeyword(data.config.keyword_suggestion);
        }
        if (data.suggestions) setSuggestions(data.suggestions);
        setPreviewKey((k) => k + 1);

        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || 'Page created and updated according to your prompt. Live preview updated.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setAttachedFile(null);
      } else {
        const fallback = generateHeuristicPage(effectivePrompt, config);
        setConfig(fallback.config);
        recordSnapshot(fallback.config, `AI Prompt: "${effectivePrompt.substring(0, 32)}"`);
        setPreviewKey((k) => k + 1);
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: fallback.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setAttachedFile(null);
      }
    } catch {
      const fallback = generateHeuristicPage(effectivePrompt, config);
      setConfig(fallback.config);
      recordSnapshot(fallback.config, `AI Prompt: "${effectivePrompt.substring(0, 32)}"`);
      setPreviewKey((k) => k + 1);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setAttachedFile(null);
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
  };

  // Apply Custom HTML / External Code changes (from v0, Bolt, Lovable, Webflow, etc.)
  const handleApplyHtml = () => {
    if (!htmlCode.trim()) return;
    const updated: VibePageConfig = {
      ...config,
      custom_html: htmlCode,
      page_type: 'custom',
    };
    setConfig(updated);
    recordSnapshot(updated, 'Pasted / Edited Custom HTML');
    setPreviewKey((k) => k + 1);
    alert('Custom HTML & Tailwind code compiled and applied to live preview canvas!');
  };

  // Helper: Inject TerraTern Universal Lead Form into custom HTML if not present
  const handleInjectLeadForm = () => {
    const leadFormSnippet = `
<!-- TerraTern Universal Lead Capture Form (Auto-Attributed) -->
<div class="my-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-lg max-w-md mx-auto">
  <h3 class="text-lg font-bold text-[#00215C] mb-1">Verify Your Profile Assessment</h3>
  <p class="text-xs text-slate-500 mb-4">Enter your details to receive your customized eligibility evaluation.</p>
  <form id="terrateern-lead-form" class="space-y-3">
    <div>
      <label class="block text-xs font-semibold text-slate-600 mb-1">Mobile Number (India +91) *</label>
      <input type="tel" name="phone" required placeholder="9876543210" class="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
    </div>
    <div>
      <label class="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
      <input type="text" name="name" required placeholder="e.g. Rahul Sharma" class="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
    </div>
    <div>
      <label class="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
      <input type="email" name="email" required placeholder="name@gmail.com" class="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm" />
    </div>
    <label class="flex items-start gap-2 text-xs text-slate-500 pt-1 cursor-pointer">
      <input type="checkbox" name="consent" checked required class="mt-0.5" />
      <span>I agree to receive my assessment roadmap via WhatsApp & Email.</span>
    </label>
    <button type="submit" class="w-full py-3 bg-[#00215C] hover:bg-[#255CC1] text-white font-bold text-xs rounded-xl transition shadow">
      Claim Strategy Consultation & Report
    </button>
  </form>
</div>
`;

    if (htmlCode.includes('terrateern-lead-form') || htmlCode.includes('id="lead-phone"')) {
      alert('Your code already has a TerraTern lead form or connector inputs!');
      return;
    }

    let updatedCode = htmlCode;
    if (updatedCode.includes('</body>')) {
      updatedCode = updatedCode.replace('</body>', `${leadFormSnippet}\n</body>`);
    } else {
      updatedCode += `\n${leadFormSnippet}`;
    }

    setHtmlCode(updatedCode);
    const updated: VibePageConfig = {
      ...config,
      custom_html: updatedCode,
      page_type: 'custom',
    };
    setConfig(updated);
    recordSnapshot(updated, 'Injected Auto Lead Capture Form');
    setPreviewKey((k) => k + 1);
    alert('Standard TerraTern Lead Capture form injected into your code and applied to live preview!');
  };

  // Apply raw JSON changes
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonCode);
      if (!parsed || typeof parsed !== 'object') throw new Error('Must be a valid JSON object');
      setConfig(parsed);
      recordSnapshot(parsed, 'Direct JSON Code Edit');
      setPreviewKey((k) => k + 1);
      setJsonError(null);
      alert('Code changes compiled and applied to live preview!');
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  // Save as Draft (stored immediately via /api/v1/admin/pages/publish with status = 'draft')
  const handleSaveDraft = async () => {
    if (!canEdit) {
      alert('Viewer accounts have read-only permissions.');
      return;
    }

    setSavingDraft(true);
    try {
      const payloadConfig: VibePageConfig = {
        ...config,
        custom_html: htmlCode || config.custom_html || synthesizeCustomHtml(config),
      };

      const res = await fetch('/api/v1/admin/pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPageId,
          config: payloadConfig,
          customSlug,
          customKeyword,
          pdfAssetId,
          status: 'draft',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save draft');
      }

      const pData = {
        id: result.page.id,
        slug: result.page.slug,
        page_key: result.page.page_key,
        name: result.page.name,
        live_url: result.live_url,
        embed_script: result.embed_script,
        social_tracked_url: result.social_tracked_url,
        status: 'draft',
      };
      setCurrentPageId(result.page.id);
      setPublishedPage(pData);
      setExistingSlugs((prev) => [...prev.filter((s) => s !== result.page.slug), result.page.slug]);
      alert(`Draft saved! Page "${result.page.name}" is now stored in Pages management.`);
    } catch (err: any) {
      console.error('Save draft error:', err);
      alert('Error saving draft: ' + (err.message || 'Database error'));
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish Page Live (stored immediately via /api/v1/admin/pages/publish with status = 'live')
  const handlePublish = async () => {
    if (!canEdit) {
      alert('Viewer accounts have read-only permissions.');
      return;
    }

    setPublishing(true);
    try {
      const payloadConfig: VibePageConfig = {
        ...config,
        custom_html: htmlCode || config.custom_html || synthesizeCustomHtml(config),
      };

      const res = await fetch('/api/v1/admin/pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentPageId,
          config: payloadConfig,
          customSlug,
          customKeyword,
          pdfAssetId,
          status: 'live',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to publish page');
      }

      const pData = {
        id: result.page.id,
        slug: result.page.slug,
        page_key: result.page.page_key,
        name: result.page.name,
        live_url: result.live_url,
        embed_script: result.embed_script,
        social_tracked_url: result.social_tracked_url,
        status: 'live',
      };
      setCurrentPageId(result.page.id);
      setPublishedPage(pData);
      setExistingSlugs((prev) => [...prev.filter((s) => s !== result.page.slug), result.page.slug]);
      setIsLinksModalOpen(true);
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Error publishing page: ' + (err.message || 'Database error'));
    } finally {
      setPublishing(false);
    }
  };

  // Quick Open Connected Page Links Modal
  const handleOpenLinksModal = async () => {
    if (publishedPage) {
      setIsLinksModalOpen(true);
      return;
    }
    await handlePublish();
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';
  const effectiveSlug = publishedPage?.slug || customSlug || config.slug_suggestion || 'assessment-demo';
  const effectiveKey = publishedPage?.page_key || 'PAGE_KEY_LIVE';
  const baseLiveUrl = publishedPage?.live_url || `${originUrl}/p/${effectiveSlug}`;
  const embedScript = publishedPage?.embed_script || `<script src="${originUrl}/connect.js" data-page-key="${effectiveKey}" async></script>`;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden font-sans">
      {/* 1. Top Vibe Studio Control Bar */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-3 sm:px-4 flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
        {/* Left: Navigation & Studio Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin/pages"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00215C] transition p-1.5 hover:bg-slate-100 rounded-lg"
            title="Return to Pages Management"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pages</span>
          </Link>

          {/* Toggle Main Navigation Sidebar */}
          <button
            type="button"
            onClick={toggleSidebar}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border ${
              sidebarCollapsed
                ? 'bg-blue-50 text-[#255CC1] border-blue-200 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title={sidebarCollapsed ? 'Expand Admin Navigation' : 'Collapse Admin Navigation'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-3.5 h-3.5 text-[#255CC1]" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden lg:inline">{sidebarCollapsed ? 'Nav' : 'Collapse Nav'}</span>
          </button>

          <span className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Page Badge & Name */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-black text-[#00215C] truncate max-w-[140px] sm:max-w-[220px]">
              {config.name}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#255CC1] border border-blue-200 px-2 py-0.5 rounded hidden sm:inline">
              Vibe Studio
            </span>
          </div>
        </div>

        {/* Center: Layout Controls & Revert Toolbar */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
          {/* Prompt Panel Toggle */}
          <button
            type="button"
            onClick={() => setIsPromptCollapsed(!isPromptCollapsed)}
            className={`p-1.5 rounded-lg text-xs font-bold transition ${
              isPromptCollapsed
                ? 'bg-blue-100 text-[#00215C]'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
            }`}
            title={isPromptCollapsed ? 'Open Prompt Column' : 'Close Prompt Column'}
          >
            {isPromptCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <span className="h-3.5 w-px bg-slate-300" />

          {/* Column Presets */}
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <button
              onClick={() => {
                setIsPromptCollapsed(false);
                setPromptWidth(30);
              }}
              className={`px-1.5 py-0.5 rounded transition ${
                !isPromptCollapsed && promptWidth === 30 ? 'bg-white font-bold text-[#00215C] shadow-2xs' : 'hover:bg-slate-200'
              }`}
              title="30% Prompt / 70% Preview"
            >
              30/70
            </button>
            <button
              onClick={() => {
                setIsPromptCollapsed(false);
                setPromptWidth(42);
              }}
              className={`px-1.5 py-0.5 rounded transition ${
                !isPromptCollapsed && promptWidth === 42 ? 'bg-white font-bold text-[#00215C] shadow-2xs' : 'hover:bg-slate-200'
              }`}
              title="42% Prompt / 58% Preview (Default)"
            >
              42/58
            </button>
            <button
              onClick={() => {
                setIsPromptCollapsed(false);
                setPromptWidth(60);
              }}
              className={`px-1.5 py-0.5 rounded transition ${
                !isPromptCollapsed && promptWidth === 60 ? 'bg-white font-bold text-[#00215C] shadow-2xs' : 'hover:bg-slate-200'
              }`}
              title="60% Prompt / 40% Preview"
            >
              60/40
            </button>
          </div>

          <span className="h-3.5 w-px bg-slate-300" />

          {/* Undo & Redo Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold text-slate-700 hover:text-[#00215C] hover:bg-slate-200/60 transition"
              title="View Version Snapshots & Revert"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>v{historyIndex + 1}</span>
            </button>
          </div>
        </div>

        {/* Right: Device View, Simulation Restart & Publishing */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Device Switcher */}
          <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewDevice('mobile')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewDevice === 'mobile'
                  ? 'bg-white text-[#00215C] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Mobile Device Simulation (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewDevice('tablet')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewDevice === 'tablet'
                  ? 'bg-white text-[#00215C] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tablet Simulation (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewDevice('desktop')}
              className={`p-1.5 rounded-lg text-xs font-bold transition ${
                viewDevice === 'desktop'
                  ? 'bg-white text-[#00215C] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Full Desktop Simulation"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Restart Simulation Button */}
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            className="p-2 text-slate-500 hover:text-[#00215C] hover:bg-slate-100 rounded-xl transition"
            title="Restart simulation from question 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Get Page Links Button */}
          <button
            type="button"
            onClick={handleOpenLinksModal}
            disabled={publishing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#00215C] font-bold text-xs rounded-xl transition shadow-2xs active:scale-95"
            title="Get Live Page Link, ManyChat URL & Embed Code"
          >
            <Link2 className="w-3.5 h-3.5 text-[#255CC1]" />
            <span className="hidden sm:inline">Get Links</span>
          </button>

          {/* Save Draft Button */}
          {canEdit && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || publishing}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition shadow-2xs disabled:opacity-50"
              title="Save directly into Pages as Draft"
            >
              {savingDraft ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
              <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
            </button>
          )}

          {/* Publish Live Button */}
          {canEdit && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || savingDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00215C] hover:bg-[#255CC1] active:scale-95 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
              title="Publish live landing page to Supabase"
            >
              {publishing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#F1C819]" />
              )}
              <span>{publishing ? 'Publishing...' : 'Publish Live'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Studio Canvas with Draggable Splitter */}
      <div
        ref={containerRef}
        className={`flex-1 flex overflow-hidden relative ${
          isDragging ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* Floating Open Pill when Prompt Column is Collapsed */}
        {isPromptCollapsed && (
          <button
            type="button"
            onClick={() => setIsPromptCollapsed(false)}
            className="absolute left-3 top-3 z-30 px-3 py-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg text-xs font-bold text-[#00215C] hover:bg-blue-50 flex items-center gap-2 transition animate-in fade-in slide-in-from-left-2 duration-150"
          >
            <PanelLeftOpen className="w-4 h-4 text-[#255CC1]" />
            <span>Open Studio Controls</span>
          </button>
        )}

        {/* LEFT COLUMN: Vibe Coding Studio Controls (Collapsible & Resizable) */}
        {!isPromptCollapsed && (
          <div
            style={{ width: `${promptWidth}%` }}
            className="h-full bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-10 overflow-hidden transition-[width] duration-75 min-w-[280px] max-w-[85vw]"
          >
            {/* Hidden File Input for Paperclip and Drag & Drop */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".html,.htm,.jsx,.tsx,.vue,.js,.ts,.json,.txt,.md,.pdf,.docx,.png,.jpg,.jpeg"
              className="hidden"
            />

            {/* Studio Mode Tabs (AI Prompter vs Upload/Import vs Code vs Visual Settings) */}
            <div className="flex border-b border-slate-200 bg-white px-2 pt-2 gap-1 flex-shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStudioTab('ai')}
                className={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  studioTab === 'ai'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F1C819]" />
                <span>AI Prompter</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioTab('upload')}
                className={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  studioTab === 'upload'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-indigo-500" />
                <span>Upload & Import</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioTab('code')}
                className={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  studioTab === 'code'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Code className="w-3.5 h-3.5 text-emerald-500" />
                <span>Code & Paste</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioTab('editor')}
                className={`pb-2.5 px-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition whitespace-nowrap ${
                  studioTab === 'editor'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>Visual Settings</span>
              </button>

              {/* Quick Revert / Undo Icon button on right of tabs */}
              <div className="ml-auto flex items-center gap-1 pb-2 pl-2">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="p-1 text-slate-400 hover:text-blue-600"
                  title="Revert / History Snapshots"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: AI Prompt Chat & Follow-ups */}
            {studioTab === 'ai' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
                {/* Generation Status Banner */}
                <div className="px-3.5 py-1.5 bg-slate-100 border-b border-slate-200/70 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isGenerating ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'
                      }`}
                    />
                    <span className="font-semibold text-slate-700">
                      {isGenerating ? generationStep || 'Generating Vibe Code...' : 'Vibe Engine Synchronized'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">v{historyIndex + 1}</span>
                </div>

                {/* Chat Log History */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[90%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#00215C] text-white rounded-br-xs whitespace-pre-wrap'
                            : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs rounded-bl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-mono">{msg.time}</span>
                    </div>
                  ))}

                  {/* Generation Loader Animation */}
                  {isGenerating && (
                    <div className="flex flex-col items-start space-y-1 animate-in fade-in">
                      <div className="bg-white border border-blue-200 p-3 rounded-2xl shadow-xs text-xs flex items-center gap-2 text-blue-700">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{generationStep || 'Compiling changes into live preview...'}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt Recommendations Chips */}
                <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Suggested Refinements:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePromptSubmit(sug)}
                        disabled={isGenerating}
                        className="text-left text-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-[#00215C] px-2.5 py-1 rounded-lg transition"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sticky Prompt Input Box */}
                <div className="p-3 bg-white border-t border-slate-200 flex-shrink-0">
                  {/* File Attachment Pill */}
                  {attachedFile && (
                    <div className="mb-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-[#255CC1] flex-shrink-0" />
                        <span className="font-bold text-[#00215C] truncate max-w-[200px] sm:max-w-xs">
                          {attachedFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ({(attachedFile.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition"
                        title="Remove attached file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePromptSubmit(promptText);
                    }}
                    className="relative flex items-center"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute left-2.5 p-1.5 text-slate-400 hover:text-[#00215C] hover:bg-slate-200/60 rounded-lg transition"
                      title="Attach a code, document, or design brief"
                    >
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder={
                        attachedFile
                          ? `Tell AI how to adapt ${attachedFile.name}...`
                          : "Describe the page, calculator, or portal you want to build..."
                      }
                      disabled={isGenerating}
                      className="w-full pl-10 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || (!promptText.trim() && !attachedFile)}
                      className="absolute right-1.5 px-3 py-1.5 bg-[#00215C] hover:bg-[#255CC1] disabled:opacity-40 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send</span>
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-1 pl-1">
                    Press <strong>Enter</strong> to send &bull; <strong>Ctrl+Z</strong> to undo
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Upload & File Ingestion Studio */}
            {studioTab === 'upload' && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto bg-slate-50/50 space-y-4">
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                    isDraggingFile
                      ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
                      : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/70 shadow-2xs'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-[#255CC1] flex items-center justify-center shadow-xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#00215C]">
                      Drop your document or code file here
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Supports <span className="font-semibold text-slate-700">.html, .jsx, .tsx, .json, .pdf, .docx, .txt, .md, images</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="px-4 py-2 bg-slate-100 hover:bg-[#00215C] text-slate-700 hover:text-white rounded-xl text-xs font-bold transition shadow-2xs"
                  >
                    Browse Files from Computer
                  </button>
                </div>

                {/* Attached File Card if present */}
                {attachedFile && (
                  <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-xs space-y-3 animate-in fade-in">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
                          {/\.(html|htm|jsx|tsx)$/i.test(attachedFile.name) ? (
                            <FileCode className="w-5 h-5" />
                          ) : (
                            <FileText className="w-5 h-5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-slate-900 truncate">
                            {attachedFile.name}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {(attachedFile.size / 1024).toFixed(1)} KB &bull; {attachedFile.type || 'document'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                        title="Remove attached file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content Snippet Preview */}
                    {attachedFile.content && (
                      <div className="max-h-28 overflow-hidden rounded-xl bg-slate-900 p-2.5 font-mono text-[11px] text-slate-300 relative">
                        <pre className="whitespace-pre-wrap break-all line-clamp-4">
                          {attachedFile.content.substring(0, 300)}...
                        </pre>
                        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      {/\.(html|htm)$/i.test(attachedFile.name) || attachedFile.content.includes('<html') || attachedFile.content.includes('<body') ? (
                        <button
                          type="button"
                          onClick={() => {
                            const next: VibePageConfig = {
                              ...config,
                              custom_html: attachedFile.content,
                              page_type: 'custom',
                            };
                            setConfig(next);
                            setHtmlCode(attachedFile.content);
                            recordSnapshot(next, `Imported File: ${attachedFile.name}`);
                            setPreviewKey((k) => k + 1);
                            alert(`File "${attachedFile.name}" loaded directly into the live preview canvas!`);
                          }}
                          className="w-full sm:flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Import Directly as Page HTML</span>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setStudioTab('ai');
                          setPromptText(`Adapt and convert this uploaded file (${attachedFile.name}) into a bespoke, high-converting TerraTern landing page with interactive elements and universal lead capture.`);
                        }}
                        className="w-full sm:flex-1 py-2.5 px-3 bg-[#00215C] hover:bg-[#255CC1] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#F1C819]" />
                        <span>Send to Vibe Prompter</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Information Callout */}
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 text-[#00215C] font-bold">
                    <Sparkles className="w-4 h-4 text-[#255CC1]" />
                    <span>How File Ingestion Works</span>
                  </div>
                  <p>
                    &bull; <strong>HTML files:</strong> Can be rendered directly in the live preview canvas or enhanced with AI.
                  </p>
                  <p>
                    &bull; <strong>Document briefs (PDF / DOCX / TXT):</strong> Vibe AI extracts the requirements, points criteria, or offer details and synthesizes an interactive page.
                  </p>
                  <p>
                    &bull; <strong>React / Tailwind components:</strong> Vibe AI converts them into production-ready HTML with auto-attributed TerraTern lead forms.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: Visual Editor Controls */}
            {studioTab === 'editor' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {/* General Info Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    General Copy & Styling
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Page Title / Name</label>
                    <input
                      type="text"
                      value={config.name}
                      onChange={(e) => {
                        const next = { ...config, name: e.target.value };
                        setConfig(next);
                      }}
                      onBlur={() => recordSnapshot(config, 'Visual Edit: Page Title')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Main Headline</label>
                    <input
                      type="text"
                      value={config.headline}
                      onChange={(e) => {
                        const next = { ...config, headline: e.target.value };
                        setConfig(next);
                      }}
                      onBlur={() => recordSnapshot(config, 'Visual Edit: Headline')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Value Prop</label>
                    <textarea
                      rows={2}
                      value={config.subtitle}
                      onChange={(e) => {
                        const next = { ...config, subtitle: e.target.value };
                        setConfig(next);
                      }}
                      onBlur={() => recordSnapshot(config, 'Visual Edit: Subtitle')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Theme Color</label>
                      <select
                        value={config.theme_accent || 'blue'}
                        onChange={(e) => {
                          const next = { ...config, theme_accent: e.target.value as any };
                          setConfig(next);
                          recordSnapshot(next, `Visual Edit: Theme Color (${e.target.value})`);
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        <option value="blue">Sapphire Blue</option>
                        <option value="navy">Royal Navy</option>
                        <option value="emerald">Emerald Green</option>
                        <option value="gold">Gold Amber</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Badge Tag</label>
                      <input
                        type="text"
                        value={config.badge_text || ''}
                        onChange={(e) => {
                          const next = { ...config, badge_text: e.target.value };
                          setConfig(next);
                        }}
                        onBlur={() => recordSnapshot(config, 'Visual Edit: Badge Text')}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                        placeholder="e.g. 🇩🇪 § 20a Chancenkarte"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Qualification Threshold Points
                    </label>
                    <input
                      type="number"
                      value={config.qualification_threshold || 6}
                      onChange={(e) => {
                        const next = { ...config, qualification_threshold: Number(e.target.value) };
                        setConfig(next);
                      }}
                      onBlur={() => recordSnapshot(config, 'Visual Edit: Threshold Points')}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Questions & Scoring List */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Assessment Questions ({config.questions?.length || 0})
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        const newQ = {
                          id: `q_${Date.now()}`,
                          question_number: (config.questions?.length || 0) + 1,
                          question: 'New Qualification Question',
                          options: [
                            { label: 'Option A (Standard)', points: 1 },
                            { label: 'Option B (Advanced)', points: 2 },
                          ],
                        };
                        const next = { ...config, questions: [...(config.questions || []), newQ] };
                        setConfig(next);
                        recordSnapshot(next, 'Added Question');
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                    >
                      + Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {config.questions?.map((q, qIdx) => (
                      <div key={qIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800">Q{qIdx + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = config.questions?.filter((_, idx) => idx !== qIdx);
                              const next = { ...config, questions: updated };
                              setConfig(next);
                              recordSnapshot(next, `Deleted Question ${qIdx + 1}`);
                            }}
                            className="text-[10px] text-rose-500 hover:underline font-semibold"
                          >
                            Remove
                          </button>
                        </div>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => {
                            const updated = [...(config.questions || [])];
                            updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                            setConfig({ ...config, questions: updated });
                          }}
                          onBlur={() => recordSnapshot(config, `Visual Edit: Q${qIdx + 1} Text`)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        />

                        {/* Options */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Answer Choices & Points:
                          </span>
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={opt.label}
                                onChange={(e) => {
                                  const updatedQuestions = [...(config.questions || [])];
                                  const updatedOpts = [...updatedQuestions[qIdx].options];
                                  updatedOpts[optIdx] = { ...updatedOpts[optIdx], label: e.target.value };
                                  updatedQuestions[qIdx].options = updatedOpts;
                                  setConfig({ ...config, questions: updatedQuestions });
                                }}
                                onBlur={() => recordSnapshot(config, `Visual Edit: Q${qIdx + 1} Option`)}
                                className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded text-xs"
                              />
                              <input
                                type="number"
                                value={opt.points}
                                onChange={(e) => {
                                  const updatedQuestions = [...(config.questions || [])];
                                  const updatedOpts = [...updatedQuestions[qIdx].options];
                                  updatedOpts[optIdx] = { ...updatedOpts[optIdx], points: Number(e.target.value) };
                                  updatedQuestions[qIdx].options = updatedOpts;
                                  setConfig({ ...config, questions: updatedQuestions });
                                }}
                                onBlur={() => recordSnapshot(config, `Visual Edit: Q${qIdx + 1} Points`)}
                                className="w-14 px-1.5 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-center"
                                title="Points awarded"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: Custom Code & Paste Studio */}
            {studioTab === 'code' && (
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950 text-slate-100 font-mono text-xs">
                {/* Sub-tab switcher: HTML & Tailwind vs JSON Spec */}
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCodeSubTab('html')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                        codeSubTab === 'html' ? 'bg-[#00215C] text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5 text-blue-400" />
                      <span>Full HTML & Tailwind</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeSubTab('json')}
                      className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1.5 ${
                        codeSubTab === 'json' ? 'bg-[#00215C] text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-400" />
                      <span>JSON Schema</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {codeSubTab === 'html' && (
                      <button
                        type="button"
                        onClick={handleInjectLeadForm}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                        title="Inject TerraTern Lead Form into your code"
                      >
                        <Sparkles className="w-3 h-3 text-[#F1C819]" />
                        <span>Inject Lead Form</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={codeSubTab === 'html' ? handleApplyHtml : handleApplyJson}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      title="Compile and apply code to live preview"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply to Preview</span>
                    </button>
                  </div>
                </div>

                {codeSubTab === 'html' ? (
                  <div className="flex-1 flex flex-col p-3 min-h-0">
                    <div className="flex items-center justify-between pb-1.5 text-[10px] text-slate-400">
                      <span>Paste any code from v0.dev, Bolt.new, Lovable, Webflow, Framer, or VS Code</span>
                      <span className="text-emerald-400 font-bold">&bull; Auto Lead Capture Active</span>
                    </div>
                    <textarea
                      value={htmlCode}
                      onChange={(e) => setHtmlCode(e.target.value)}
                      placeholder="<!-- Paste your full HTML, Tailwind CSS, or React exported markup here -->"
                      className="flex-1 w-full bg-slate-900 text-slate-200 p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs resize-none leading-relaxed select-text"
                      spellCheck={false}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col p-3 min-h-0">
                    {jsonError && (
                      <div className="mb-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded text-xs flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{jsonError}</span>
                      </div>
                    )}
                    <textarea
                      value={jsonCode}
                      onChange={(e) => setJsonCode(e.target.value)}
                      className="flex-1 w-full bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs resize-none leading-relaxed select-text"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DRAGGABLE SPLITTER DIVIDER (Between Prompt & Preview Columns) */}
        {!isPromptCollapsed && (
          <div
            onMouseDown={() => setIsDragging(true)}
            onDoubleClick={() => setPromptWidth(42)}
            className="w-2.5 bg-slate-200/90 hover:bg-blue-500 active:bg-blue-600 cursor-col-resize flex flex-col items-center justify-center transition-colors relative z-20 group flex-shrink-0 select-none shadow-2xs"
            title="Drag to resize columns • Double-click to reset (42/58)"
          >
            <div className="w-1 h-8 rounded-full bg-slate-400 group-hover:bg-white transition-colors" />
          </div>
        )}

        {/* RIGHT COLUMN: Interactive Live Simulation Preview Canvas */}
        <div className="flex-1 h-full bg-slate-200/75 p-3 sm:p-5 flex flex-col items-center justify-center overflow-hidden min-w-0 relative">
          {/* Simulated Browser URL bar */}
          <div className="w-full max-w-xl mb-3 flex items-center justify-between gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="font-mono text-[11px] truncate text-slate-700 select-all font-semibold">
                {baseLiveUrl}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(baseLiveUrl);
                  setPreviewCopied(true);
                  setTimeout(() => setPreviewCopied(false), 2000);
                }}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-[#00215C] hover:bg-slate-100 flex items-center gap-1 transition"
                title="Copy Live Page URL"
              >
                {previewCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{previewCopied ? 'Copied' : 'Copy'}</span>
              </button>
              <a
                href={baseLiveUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition"
                title="Open live assessment in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <span className="h-3 w-px bg-slate-200" />
              <button
                type="button"
                onClick={handleOpenLinksModal}
                className="px-2 py-0.5 rounded text-[11px] font-bold text-[#00215C] bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1 transition"
                title="Get Connected Embed Code & ManyChat Link"
              >
                <Link2 className="w-3 h-3 text-[#255CC1]" />
                <span>Get Links</span>
              </button>
            </div>
          </div>

          {/* Interactive Simulation Frame */}
          <div
            className={`transition-all duration-200 overflow-hidden flex flex-col items-center justify-center ${
              viewDevice === 'mobile'
                ? 'w-[375px] max-w-full h-[700px] max-h-[92%] rounded-[36px] border-[8px] border-slate-800 shadow-2xl bg-white relative'
                : viewDevice === 'tablet'
                ? 'w-[768px] max-w-full h-[850px] max-h-[94%] rounded-[24px] border-[6px] border-slate-700 shadow-2xl bg-white'
                : 'w-full h-full max-w-4xl rounded-2xl border border-slate-300 shadow-xl bg-white'
            }`}
          >
            {/* Mobile Speaker Notch */}
            {viewDevice === 'mobile' && (
              <div className="w-28 h-4 bg-slate-800 rounded-b-xl flex-shrink-0 mx-auto" />
            )}

            {/* Simulated Live Assessment Component */}
            <div className="w-full h-full overflow-y-auto">
              <VibePagePreview
                key={previewKey}
                config={config}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Revert / Version Snapshots History Modal */}
      {isHistoryModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsHistoryModalOpen(false)}
          title="Version History & Revert"
          description="Restore your page state to any previous prompt or edit snapshot."
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Saved Versions: {history.length}
              </span>
              <button
                type="button"
                onClick={handleResetInitial}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Blank Canvas</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {history.map((snap, idx) => {
                const isCurrent = idx === historyIndex;
                return (
                  <div
                    key={snap.id}
                    className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                          isCurrent ? 'bg-[#00215C] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        v{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {snap.description}
                          </span>
                          {isCurrent && (
                            <span className="text-[9px] font-bold uppercase bg-blue-600 text-white px-1.5 py-0.5 rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                          Recorded at {snap.timestamp} &bull; {snap.config.questions?.length || 0} questions
                        </span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevertTo(idx)}
                        className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs flex-shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Revert</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* 4. Publish Success & Connected Page Links Modal */}
      {(isLinksModalOpen || publishedPage) && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsLinksModalOpen(false);
          }}
          title={publishedPage?.status === 'draft' ? "📝 Page Saved as Draft" : "🎉 Connected Page Links & Integrations"}
          description="Access your live URL, social media tracking links, and external website embed scripts."
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Modal Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setLinksModalTab('live')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  linksModalTab === 'live'
                    ? 'bg-white text-[#00215C] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>Live & Social Links</span>
              </button>
              <button
                type="button"
                onClick={() => setLinksModalTab('embed')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  linksModalTab === 'embed'
                    ? 'bg-white text-[#00215C] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>External Website Embed</span>
              </button>
              <button
                type="button"
                onClick={() => setLinksModalTab('api')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  linksModalTab === 'api'
                    ? 'bg-white text-[#00215C] shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Terminal className="w-3.5 h-3.5 text-amber-600" />
                <span>ManyChat / Webhook API</span>
              </button>
            </div>

            {/* TAB 1: Live Assessment & Campaign UTM Builder */}
            {linksModalTab === 'live' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                {/* Direct Live URL */}
                <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Direct Live Page URL (Default)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Direct Link &bull; Live
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Default clean link without any query parameters. Inbound visitors will automatically be recorded with source: <span className="font-mono font-bold text-slate-700">direct</span>.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={baseLiveUrl}
                      className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(baseLiveUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                    <a
                      href={baseLiveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition flex-shrink-0"
                      title="Open live page in new window"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Campaign UTM Builder Feature */}
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
                    Need to run a specific campaign or track ads? Customize source, medium, and campaign tags below to generate an attribution-ready link.
                  </p>

                  {/* Source Quick-Selector Chips */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      1. Quick Source Preset
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'instagram', label: 'Instagram' },
                        { id: 'facebook', label: 'Facebook' },
                        { id: 'whatsapp', label: 'WhatsApp' },
                        { id: 'youtube', label: 'YouTube' },
                        { id: 'linkedin', label: 'LinkedIn' },
                        { id: 'email', label: 'Email' },
                        { id: 'google', label: 'Google' },
                      ].map((src) => {
                        const isSelected = utmSource.toLowerCase() === src.id;
                        return (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => setUtmSource(isSelected ? '' : src.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              isSelected
                                ? 'bg-[#00215C] text-white border-[#00215C] shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
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
                        { id: 'dm', label: 'DM / Chat' },
                        { id: 'bio', label: 'Bio Link' },
                        { id: 'story', label: 'Story' },
                        { id: 'post', label: 'Post / Reel' },
                        { id: 'ad', label: 'Paid Ad' },
                        { id: 'newsletter', label: 'Newsletter' },
                      ].map((med) => {
                        const isSelected = utmMedium.toLowerCase() === med.id;
                        return (
                          <button
                            key={med.id}
                            type="button"
                            onClick={() => setUtmMedium(isSelected ? '' : med.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              isSelected
                                ? 'bg-[#255CC1] text-white border-[#255CC1] shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
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
                        value={getCustomCampaignUrl(baseLiveUrl)}
                        className="w-full bg-white px-3 py-2 border border-blue-200 rounded-xl text-xs font-mono text-blue-900 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const campaignUrl = getCustomCampaignUrl(baseLiveUrl);
                          navigator.clipboard.writeText(campaignUrl);
                          setCopiedUtmLink(true);
                          setTimeout(() => setCopiedUtmLink(false), 2000);
                        }}
                        className="px-3.5 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                      >
                        {copiedUtmLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedUtmLink ? 'Copied' : 'Copy Campaign Link'}</span>
                      </button>
                      {(utmSource || utmMedium || utmCampaign || utmTerm || utmContent) && (
                        <a
                          href={getCustomCampaignUrl(baseLiveUrl)}
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

            {/* TAB 2: External Website Embed Script */}
            {linksModalTab === 'embed' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                  <strong>Connect External Websites:</strong> Paste this lightweight 1-line script tag into your WordPress, Webflow, Squarespace, Framer, Wix, or custom HTML page. It automatically connects all lead submissions directly to TerraTern.
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-slate-500 uppercase">
                    <span>1-Line Connector Snippet</span>
                    <span className="font-mono text-slate-400">async load</span>
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre select-all">
                    {embedScript}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(embedScript);
                      setCopiedEmbedScript(true);
                      setTimeout(() => setCopiedEmbedScript(false), 2000);
                    }}
                    className="absolute top-7 right-2.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-xs"
                  >
                    {copiedEmbedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEmbedScript ? 'Copied' : 'Copy Snippet'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                  <span className="font-bold text-slate-800 block">How it works:</span>
                  <p>&bull; Listens to any standard HTML form on your external website.</p>
                  <p>&bull; Automatically normalizes Indian & international phone numbers (+91 / E.164).</p>
                  <p>&bull; Captures and attributes UTM source tags, keywords, and referral URLs.</p>
                </div>
              </div>
            )}

            {/* TAB 3: API & Webhook */}
            {linksModalTab === 'api' && (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    Page Key (Permanent Identifier)
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={effectiveKey}
                      className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 select-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(effectiveKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    ManyChat External Request Payload (POST {originUrl}/api/v1/leads)
                  </span>
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre select-all">
{JSON.stringify(
  {
    page_key: effectiveKey,
    phone: "{{phone}}",
    name: "{{full_name}}",
    email: "{{email}}",
    source: "manychat",
    keyword: customKeyword || config.keyword_suggestion || "DIRECT",
    consent: true,
  },
  null,
  2
)}
                  </pre>
                </div>
              </div>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                Key: {effectiveKey}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinksModalOpen(false);
                    router.push('/admin/pages');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                >
                  Go to Pages Management
                </button>
                <button
                  type="button"
                  onClick={() => setIsLinksModalOpen(false)}
                  className="px-4 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl transition shadow-xs"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
