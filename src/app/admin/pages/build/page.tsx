'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { generateUniqueSlug, generatePageKey } from '@/lib/utils';
import { Asset } from '@/lib/types';
import { VibePageConfig, generateHeuristicPage } from '@/lib/vibe-engine';
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
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

interface ConfigSnapshot {
  id: string;
  timestamp: string;
  description: string;
  config: VibePageConfig;
}

const PRESET_TEMPLATES = [
  { label: '🇩🇪 Germany Opportunity Card', prompt: 'Germany Opportunity Card Points Calculator' },
  { label: '🍁 Canada CRS Calculator', prompt: 'Canada Express Entry CRS Points Estimator' },
  { label: '🇦🇺 Australia 189 Assessment', prompt: 'Australia Subclass 189 Points Assessment' },
  { label: '📄 2026 Salary Guide PDF', prompt: '2026 PR Salary & NOC Checklist PDF' },
  { label: '📞 Free Consultation', prompt: 'Free 1-on-1 Immigration Consultation' },
];

export default function VibeStudioPage() {
  const router = useRouter();
  const { canEdit, sidebarCollapsed, toggleSidebar } = useAdmin();
  const supabase = createClient();

  // Root canvas container ref for draggable splitter
  const containerRef = useRef<HTMLDivElement>(null);

  // Active Draft Config
  const [config, setConfig] = useState<VibePageConfig>(() => {
    return generateHeuristicPage('Germany Opportunity Card Points Calculator').config;
  });

  // Version History / Revert System
  const [history, setHistory] = useState<ConfigSnapshot[]>(() => {
    const initial = generateHeuristicPage('Germany Opportunity Card Points Calculator').config;
    return [
      {
        id: 'snap_0',
        timestamp: 'Initial',
        description: 'Template: Germany Opportunity Card',
        config: JSON.parse(JSON.stringify(initial)),
      },
    ];
  });
  const [historyIndex, setHistoryIndex] = useState(0);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Layout & Splitter States
  const [promptWidth, setPromptWidth] = useState<number>(42); // 42% default
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Builder Left Panel Tab: 'ai' | 'editor' | 'code'
  const [studioTab, setStudioTab] = useState<'ai' | 'editor' | 'code'>('ai');

  // Preview Mode & Simulation Reset
  const [viewDevice, setViewDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [previewKey, setPreviewKey] = useState(1);

  // Raw JSON Editor
  const [jsonCode, setJsonCode] = useState(() => JSON.stringify(config, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

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
        'Describe the landing page or quiz you need for your social media campaign, or pick a 1-click template above.',
      time: 'Just now',
    },
  ]);

  const [suggestions, setSuggestions] = useState<string[]>([
    'Make headline more urgent for 2026 intake',
    'Add question about German language proficiency',
    'Change accent color to emerald',
    'Require 6 points to qualify for job search',
  ]);

  // Metadata Settings
  const [customSlug, setCustomSlug] = useState('');
  const [customKeyword, setCustomKeyword] = useState('');
  const [pdfAssetId, setPdfAssetId] = useState<string>('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);

  // Publishing & Saving State
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishedPage, setPublishedPage] = useState<{
    slug: string;
    page_key: string;
  } | null>(null);

  // Social Link Builder inside Publish Modal
  const [socialPlatform, setSocialPlatform] = useState('ig_dm');
  const [campaignKeyword, setCampaignKeyword] = useState('');
  const [campaignPostId, setCampaignPostId] = useState('reel_101');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSocialLink, setCopiedSocialLink] = useState(false);

  // Sync JSON editor when config updates
  useEffect(() => {
    setJsonCode(JSON.stringify(config, null, 2));
    setJsonError(null);
  }, [config]);

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
      setCampaignKeyword(config.keyword_suggestion);
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

  // Load a preset template
  const handleLoadPreset = (prompt: string) => {
    const fallback = generateHeuristicPage(prompt, config);
    setConfig(fallback.config);
    if (fallback.config.slug_suggestion) setCustomSlug(fallback.config.slug_suggestion);
    if (fallback.config.keyword_suggestion) {
      setCustomKeyword(fallback.config.keyword_suggestion);
      setCampaignKeyword(fallback.config.keyword_suggestion);
    }
    setPreviewKey((k) => k + 1);
    recordSnapshot(fallback.config, `Loaded Template: ${fallback.config.name}`);
    setChatHistory((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Loaded ${fallback.config.name}. You can customize copy, score points, or prompt modifications.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Call In-Portal AI Engine
  const handlePromptSubmit = async (userPrompt: string) => {
    if (!userPrompt.trim() || isGenerating) return;

    const trimmed = userPrompt.trim();
    setIsGenerating(true);
    setGenerationStep('Analyzing prompt requirements...');
    setPromptText('');

    const updatedHistory = [
      ...chatHistory,
      {
        role: 'user' as const,
        content: trimmed,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
    setChatHistory(updatedHistory);

    try {
      setTimeout(() => setGenerationStep('Compiling points matrix & qualification rules...'), 400);
      setTimeout(() => setGenerationStep('Rendering interactive simulation tree...'), 900);

      const res = await fetch('/api/v1/admin/studio/vibe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          currentConfig: config,
          history: updatedHistory.map((h) => ({ role: h.role, content: h.content })),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.config) {
        setConfig(data.config);
        recordSnapshot(data.config, `AI Prompt: "${trimmed.substring(0, 32)}${trimmed.length > 32 ? '...' : ''}"`);
        if (data.config.slug_suggestion) setCustomSlug(data.config.slug_suggestion);
        if (data.config.keyword_suggestion) {
          setCustomKeyword(data.config.keyword_suggestion);
          setCampaignKeyword(data.config.keyword_suggestion);
        }
        if (data.suggestions) setSuggestions(data.suggestions);
        setPreviewKey((k) => k + 1);

        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || 'Page updated according to your prompt. Live preview updated.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const fallback = generateHeuristicPage(trimmed, config);
        setConfig(fallback.config);
        recordSnapshot(fallback.config, `AI Prompt: "${trimmed.substring(0, 32)}"`);
        setPreviewKey((k) => k + 1);
        setChatHistory((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: fallback.message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {
      const fallback = generateHeuristicPage(trimmed, config);
      setConfig(fallback.config);
      recordSnapshot(fallback.config, `AI Prompt: "${trimmed.substring(0, 32)}"`);
      setPreviewKey((k) => k + 1);
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: fallback.message,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsGenerating(false);
      setGenerationStep(null);
    }
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

  // Save as Draft (stored immediately in Supabase pages table with status = 'draft')
  const handleSaveDraft = async () => {
    if (!canEdit) {
      alert('Viewer accounts have read-only permissions.');
      return;
    }

    setSavingDraft(true);
    try {
      const slug = generateUniqueSlug(customSlug || config.name, existingSlugs);
      const pageKey = generatePageKey();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';

      const { data, error } = await supabase
        .from('pages')
        .insert({
          name: config.name,
          slug,
          page_key: pageKey,
          page_type: config.page_type,
          status: 'draft',
          keyword: customKeyword || config.keyword_suggestion || null,
          pdf_asset_id: pdfAssetId || null,
          allowed_origins: [origin],
          closed_message: 'This assessment is currently in draft mode.',
          closed_redirect_url: 'https://terratern.com',
          config: config,
        })
        .select()
        .single();

      if (error) throw error;

      setExistingSlugs((prev) => [...prev, data.slug]);
      alert(`Draft saved! Page "${data.name}" is now stored in Pages management with status Draft.`);
    } catch (err: any) {
      console.error('Save draft error:', err);
      alert('Error saving draft: ' + (err.message || 'Database error'));
    } finally {
      setSavingDraft(false);
    }
  };

  // Publish Page Live (stored in Supabase pages table with status = 'live')
  const handlePublish = async () => {
    if (!canEdit) {
      alert('Viewer accounts have read-only permissions.');
      return;
    }

    setPublishing(true);
    try {
      const slug = generateUniqueSlug(customSlug || config.name, existingSlugs);
      const pageKey = generatePageKey();
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';

      const { data, error } = await supabase
        .from('pages')
        .insert({
          name: config.name,
          slug,
          page_key: pageKey,
          page_type: config.page_type,
          status: 'live',
          keyword: customKeyword || config.keyword_suggestion || null,
          pdf_asset_id: pdfAssetId || null,
          allowed_origins: [origin],
          closed_message: 'This assessment is temporarily paused for updates. Please contact our team.',
          closed_redirect_url: 'https://terratern.com',
          config: config,
        })
        .select()
        .single();

      if (error) throw error;

      setPublishedPage({
        slug: data.slug,
        page_key: data.page_key,
      });
      setExistingSlugs((prev) => [...prev, data.slug]);
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Network error while publishing: ' + (err.message || 'Database error'));
    } finally {
      setPublishing(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const baseLiveUrl = publishedPage ? `${originUrl}/p/${publishedPage.slug}` : '';
  const socialTrackedUrl = publishedPage
    ? `${baseLiveUrl}?src=${socialPlatform}&kw=${encodeURIComponent(
        campaignKeyword || customKeyword || 'GENERAL'
      )}&post_id=${encodeURIComponent(campaignPostId || 'post_1')}`
    : '';

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
            {/* Top Template Presets Bar */}
            <div className="p-2 sm:p-2.5 bg-slate-50/90 border-b border-slate-200/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pl-1 flex-shrink-0">
                Templates:
              </span>
              {PRESET_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => handleLoadPreset(tmpl.prompt)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold text-slate-700 hover:text-[#00215C] whitespace-nowrap transition flex-shrink-0 shadow-2xs"
                >
                  {tmpl.label}
                </button>
              ))}
            </div>

            {/* Studio Mode Tabs (AI Prompt vs Visual Editor vs Code) */}
            <div className="flex border-b border-slate-200 bg-white px-3 pt-2 gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setStudioTab('ai')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  studioTab === 'ai'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>AI Prompt</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioTab('editor')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  studioTab === 'editor'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Visual Editor</span>
              </button>

              <button
                type="button"
                onClick={() => setStudioTab('code')}
                className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-1.5 border-b-2 transition ${
                  studioTab === 'code'
                    ? 'border-[#255CC1] text-[#00215C]'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>Raw Code / JSON</span>
              </button>

              {/* Quick Revert / Undo Icon button on right of tabs */}
              <div className="ml-auto flex items-center gap-1 pb-2">
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
                  title="Revert / History"
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
                            ? 'bg-[#00215C] text-white rounded-br-xs'
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePromptSubmit(promptText);
                    }}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="Ask Vibe Agent to tweak headline, questions, points..."
                      disabled={isGenerating}
                      className="w-full pl-3.5 pr-20 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    />
                    <button
                      type="submit"
                      disabled={isGenerating || !promptText.trim()}
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

            {/* TAB CONTENT 3: Raw Code / JSON Spec */}
            {studioTab === 'code' && (
              <div className="flex-1 flex flex-col min-h-0 p-4 bg-slate-900 text-slate-100 font-mono text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span className="font-bold text-slate-300">page_config.json</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyJson}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply Changes</span>
                  </button>
                </div>

                {jsonError && (
                  <div className="mt-2 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{jsonError}</span>
                  </div>
                )}

                <textarea
                  value={jsonCode}
                  onChange={(e) => setJsonCode(e.target.value)}
                  className="flex-1 w-full bg-slate-950 text-emerald-400 p-3 mt-2 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-xs resize-none leading-relaxed"
                  spellCheck={false}
                />
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
          <div className="w-full max-w-xl mb-3 flex items-center justify-between gap-2 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-mono text-[11px] truncate text-slate-700">
                https://terratern.com/p/{customSlug || 'assessment-demo'}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden sm:inline">
              Live Preview
            </span>
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
                <span>Reset to Initial Template</span>
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

      {/* 4. Publish Success & Social Share Modal */}
      {publishedPage && (
        <Modal
          isOpen={true}
          onClose={() => setPublishedPage(null)}
          title="🎉 Assessment Page Published Live!"
          description="Your high-converting quiz is live in production and ready to capture leads."
          maxWidth="lg"
        >
          <div className="space-y-5">
            {/* Live Link Box */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Live Public URL
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={baseLiveUrl}
                  className="w-full bg-white px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(baseLiveUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
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

            {/* Social DM & ManyChat Link Builder */}
            <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-[#00215C]">
                <Share2 className="w-4 h-4 text-[#255CC1]" />
                <h4 className="font-bold text-xs uppercase tracking-wider">
                  Social DM / ManyChat Campaign Link
                </h4>
              </div>
              <p className="text-xs text-slate-600">
                Generate attribution parameters to track conversions by keyword and post.
              </p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Channel Source
                  </label>
                  <select
                    value={socialPlatform}
                    onChange={(e) => setSocialPlatform(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold"
                  >
                    <option value="ig_dm">Instagram DM</option>
                    <option value="ig_bio">Instagram Bio</option>
                    <option value="fb_ad">Facebook Ads</option>
                    <option value="wa_chat">WhatsApp Direct</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Campaign Keyword
                  </label>
                  <input
                    type="text"
                    value={campaignKeyword}
                    onChange={(e) => setCampaignKeyword(e.target.value)}
                    placeholder="e.g. GERMANY2026"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              {/* Generated Social Link */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={socialTrackedUrl}
                  className="w-full bg-white px-3 py-2 border border-blue-200 rounded-xl text-xs font-mono text-blue-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(socialTrackedUrl);
                    setCopiedSocialLink(true);
                    setTimeout(() => setCopiedSocialLink(false), 2000);
                  }}
                  className="px-3.5 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition flex-shrink-0"
                >
                  {copiedSocialLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSocialLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPublishedPage(null);
                  router.push('/admin/pages');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
              >
                Go to Pages Management
              </button>
              <button
                type="button"
                onClick={() => setPublishedPage(null)}
                className="px-4 py-2 bg-[#00215C] hover:bg-[#255CC1] text-white text-xs font-bold rounded-xl transition shadow-xs"
              >
                Keep Editing in Studio
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
