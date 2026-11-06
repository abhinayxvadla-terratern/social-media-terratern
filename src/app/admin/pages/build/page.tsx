'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAdmin } from '@/contexts/AdminContext';
import { generateUniqueSlug } from '@/lib/utils';
import { Asset } from '@/lib/types';
import {
  ArrowLeft,
  Upload,
  FileCode,
  Check,
  Copy,
  ExternalLink,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
  AlertCircle,
  FileText,
  Link2,
  Code2,
  Sparkles,
  Layers,
  Globe,
  Share2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export default function BuildPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageId = searchParams.get('id');
  const { canEdit, sidebarCollapsed, toggleSidebar } = useAdmin();
  const supabase = createClient();

  // Core File & Code State (Zero mock/seed data - purely file driven)
  const [htmlCode, setHtmlCode] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'upload' | 'code'>('upload');

  // Page Settings
  const [pageName, setPageName] = useState<string>('');
  const [customSlug, setCustomSlug] = useState<string>('');
  const [customKeyword, setCustomKeyword] = useState<string>('');
  const [pdfAssetId, setPdfAssetId] = useState<string>('');
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);

  // Canvas / Viewport State
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Publishing State
  const [publishing, setPublishing] = useState(false);
  const [publishedPage, setPublishedPage] = useState<any>(null);
  const [isLinksModalOpen, setIsLinksModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);

  // UTM Builder State for Links Modal
  const [utmSource, setUtmSource] = useState('direct');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  // Fetch available PDF assets
  useEffect(() => {
    async function loadAssets() {
      const { data } = await supabase
        .from('assets')
        .select('*')
        .order('name', { ascending: true });
      if (data) setAvailableAssets(data as Asset[]);
    }
    loadAssets();
  }, []);

  // Load existing page if editing (?id=...)
  useEffect(() => {
    if (!pageId) return;

    async function loadExistingPage() {
      setLoadingInitial(true);
      try {
        const { data, error } = await supabase
          .from('pages')
          .select('*, assets(id, name)')
          .eq('id', pageId)
          .single();

        if (data && !error) {
          setPageName(data.name || '');
          setCustomSlug(data.slug || '');
          setCustomKeyword(data.keyword || '');
          setPdfAssetId(data.pdf_asset_id || '');
          const existingHtml = data.config?.custom_html || '';
          setHtmlCode(existingHtml);
          setFileName('Existing Page File');
          analyzeHtml(existingHtml);
        }
      } catch (e) {
        console.error('Failed to load page for editing:', e);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadExistingPage();
  }, [pageId]);

  // Inspect HTML for title and metadata
  const analyzeHtml = (content: string) => {
    if (!content) return;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');

      // Auto-extract title if pageName is not yet set
      const titleTag = doc.querySelector('title');
      const h1Tag = doc.querySelector('h1');
      if (!pageName) {
        const extracted = titleTag?.textContent?.trim() || h1Tag?.textContent?.trim() || '';
        if (extracted) {
          setPageName(extracted);
          if (!customSlug) {
            setCustomSlug(generateUniqueSlug(extracted, []));
          }
        }
      }
    } catch {
      // Ignore parsing errors for partial code
    }
  };

  // Handle file ingestion (drop or input)
  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['html', 'htm', 'jsx', 'tsx', 'txt', 'js'];
    if (!allowed.includes(ext || '')) {
      alert('Please upload a valid web page file (.html, .htm, .jsx, .tsx, .txt)');
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setHtmlCode(text);
      analyzeHtml(text);

      // Auto-populate name & slug if empty
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const cleanTitle = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      if (!pageName) {
        setPageName(cleanTitle);
      }
      if (!customSlug) {
        setCustomSlug(generateUniqueSlug(baseName, []));
      }
      setPreviewKey((k) => k + 1);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Handle Publish Action
  const handlePublish = async () => {
    if (!canEdit) {
      alert('Viewer accounts have read-only permissions.');
      return;
    }

    if (!htmlCode || htmlCode.trim().length < 10) {
      alert('Please upload or provide HTML code for the landing page before publishing.');
      return;
    }

    const finalName = pageName.trim() || 'Custom Landing Page';
    const finalSlug = customSlug.trim()
      ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
      : generateUniqueSlug(finalName, []);

    setPublishing(true);
    try {
      const res = await fetch('/api/v1/admin/pages/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pageId || undefined,
          config: {
            name: finalName,
            custom_html: htmlCode,
            page_type: 'custom',
            slug_suggestion: finalSlug,
            keyword_suggestion: customKeyword || null,
          },
          customSlug: finalSlug,
          customKeyword: customKeyword || null,
          pdfAssetId: pdfAssetId || null,
          status: 'live',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to publish page.');
      }

      setPublishedPage(result.page);
      setIsLinksModalOpen(true);
    } catch (err: any) {
      console.error('Publish error:', err);
      alert('Error publishing page: ' + (err.message || 'Database error'));
    } finally {
      setPublishing(false);
    }
  };

  // Prepared instrumented preview HTML with the database bridge injected
  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';
  const effectiveSlug = customSlug || 'preview-page';
  const effectiveKey = publishedPage?.page_key || 'pk_preview_live';

  const previewHtml = (() => {
    if (!htmlCode) return '';
    let html = htmlCode;
    const injection = `
      <script>
        window.__TT_PAGE_KEY__ = "${effectiveKey}";
        window.__TT_PAGE_SLUG__ = "${effectiveSlug}";
        window.__TT_API_HOST__ = "${originUrl}";
        window.__TT_PREVIEW_MODE__ = true;
        window.__TT_DOWNLOAD_URL__ = "${pdfAssetId ? `${originUrl}/api/v1/download?asset_id=${pdfAssetId}` : ''}";
      </script>
      <script src="${originUrl}/connect.js" data-page-key="${effectiveKey}" async></script>
    `;

    // Ensure base href exists so relative assets and API links resolve
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head><base href="${originUrl}/">`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html><head><base href="${originUrl}/"></head>`);
    } else {
      html = `<base href="${originUrl}/">` + html;
    }

    if (html.includes('</body>')) {
      return html.replace('</body>', `${injection}</body>`);
    }
    return html + injection;
  })();

  // Constructed live URL for modal
  const liveUrl = publishedPage
    ? `${originUrl}/p/${publishedPage.slug}`
    : `${originUrl}/p/${effectiveSlug}`;

  const campaignUrl = (() => {
    try {
      const u = new URL(liveUrl);
      if (utmSource) u.searchParams.set('utm_source', utmSource);
      if (utmMedium) u.searchParams.set('utm_medium', utmMedium);
      if (utmCampaign) u.searchParams.set('utm_campaign', utmCampaign);
      if (customKeyword) u.searchParams.set('kw', customKeyword);
      return u.toString();
    } catch {
      return liveUrl;
    }
  })();

  const embedScript = `<script src="${originUrl}/connect.js" data-page-key="${effectiveKey}" async></script>`;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Header Navigation Bar */}
      <header className="h-14 bg-white border-b border-slate-200/90 px-4 flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
        {/* Left: Return & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#00215C] transition p-1.5 hover:bg-slate-100 rounded-lg"
            title="Return to Pages Management"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pages</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#00215C]">Page Studio</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#255CC1] border border-blue-200 px-2 py-0.5 rounded-full">
                File & DB Connector
              </span>
            </div>
            {customSlug && (
              <span className="text-[11px] font-mono text-slate-400 block -mt-0.5">
                /p/{customSlug}
              </span>
            )}
          </div>
        </div>

        {/* Center: Viewport Controls */}
        <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setViewport('desktop')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewport === 'desktop'
                ? 'bg-white text-[#00215C] shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('tablet')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewport === 'tablet'
                ? 'bg-white text-[#00215C] shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            <span>Tablet</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport('mobile')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewport === 'mobile'
                ? 'bg-white text-[#00215C] shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Mobile</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {publishedPage && (
            <button
              type="button"
              onClick={() => setIsLinksModalOpen(true)}
              className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#255CC1] border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Get Links</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing || !htmlCode}
            className="px-4 py-1.5 bg-[#00215C] hover:bg-[#255CC1] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            {publishing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Publishing Live...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#F1C819]" />
                <span>Publish Page</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. Main Studio Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: File Ingestion & DB Configuration Panel */}
        <div className="w-full md:w-[420px] lg:w-[460px] bg-white border-r border-slate-200/90 flex flex-col flex-shrink-0 z-10 overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-5">
            {/* Tab: Upload File vs Direct Code */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-white text-[#00215C] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'code'
                    ? 'bg-white text-[#00215C] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Direct HTML Code</span>
              </button>
            </div>

            {/* Upload Zone */}
            {activeTab === 'upload' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-[#255CC1] bg-blue-50/50'
                    : htmlCode
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".html,.htm,.jsx,.tsx,.txt,.js"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#255CC1] border border-blue-200/60 flex items-center justify-center mx-auto mb-3">
                  {htmlCode ? (
                    <FileCode className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>

                {htmlCode ? (
                  <div>
                    <span className="font-bold text-xs text-slate-900 block truncate max-w-[280px] mx-auto">
                      {fileName || 'Custom File Loaded'}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {fileSize || `${(htmlCode.length / 1024).toFixed(1)} KB`} &bull; Click to replace file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      Drop your landing page file here
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Supports .html, .jsx, .tsx, .txt exports from Lovable, v0, Bolt, Figma
                    </span>
                    <span className="inline-block mt-3 px-3 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 shadow-2xs">
                      Browse Files
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Paste HTML Code
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setHtmlCode('');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <textarea
                  value={htmlCode}
                  onChange={(e) => {
                    setHtmlCode(e.target.value);
                    analyzeHtml(e.target.value);
                    setPreviewKey((k) => k + 1);
                  }}
                  placeholder="<!DOCTYPE html><html><body><h1>My Custom Page</h1><form>...</form></body></html>"
                  className="w-full h-44 p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none select-text"
                />
              </div>
            )}

            {/* Page Settings Form */}
            <div className="space-y-4 pt-1">
              {/* Page Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Page Name *
                </label>
                <input
                  type="text"
                  required
                  value={pageName}
                  onChange={(e) => {
                    setPageName(e.target.value);
                    if (!customSlug) {
                      setCustomSlug(generateUniqueSlug(e.target.value, []));
                    }
                  }}
                  placeholder="e.g. Express Entry Eligibility Calculator"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#255CC1]"
                />
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Custom URL Slug *
                </label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono">
                  <span className="text-slate-400 font-semibold select-none">/p/</span>
                  <input
                    type="text"
                    required
                    value={customSlug}
                    onChange={(e) =>
                      setCustomSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '-')
                          .replace(/-+/g, '-')
                      )
                    }
                    placeholder="my-page-slug"
                    className="w-full bg-transparent text-slate-900 font-bold focus:outline-none ml-0.5"
                  />
                </div>
              </div>

              {/* Campaign Keyword */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Campaign Keyword (Optional)
                </label>
                <input
                  type="text"
                  value={customKeyword}
                  onChange={(e) => setCustomKeyword(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="e.g. PR_ROADMAP"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono uppercase text-slate-900 focus:bg-white focus:outline-none focus:border-[#255CC1]"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Assign a keyword for ManyChat or Instagram bio attribution.
                </span>
              </div>

              {/* PDF Asset Attachment */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Attach Guide PDF for Download (Optional)
                </label>
                <select
                  value={pdfAssetId}
                  onChange={(e) => setPdfAssetId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none"
                >
                  <option value="">No PDF attached</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Lead will receive a secure 10-minute download link upon form submission.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Real-time Live Preview Window */}
        <div className="flex-1 bg-slate-100 flex flex-col overflow-hidden relative">
          {/* Preview Toolbar */}
          <div className="h-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/80 px-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
              <Globe className="w-3.5 h-3.5 text-[#255CC1]" />
              <span>{originUrl}/p/{effectiveSlug}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewKey((k) => k + 1)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                title="Reload preview"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport Area */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            {htmlCode ? (
              <div
                className={`h-full bg-white rounded-2xl shadow-md border border-slate-200/80 overflow-hidden transition-all duration-300 flex flex-col ${
                  viewport === 'mobile'
                    ? 'w-[375px]'
                    : viewport === 'tablet'
                    ? 'w-[768px]'
                    : 'w-full'
                }`}
              >
                <iframe
                  key={previewKey}
                  srcDoc={previewHtml}
                  title="Landing Page Live Preview"
                  className="w-full flex-1 border-0"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
                />
              </div>
            ) : (
              <div className="text-center p-8 max-w-sm space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                  <FileCode className="w-7 h-7 text-[#255CC1]" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">No Page File Loaded Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upload an HTML landing page on the left pane. You will see an instant interactive preview with automatic database form capture enabled.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#00215C] text-white rounded-xl text-xs font-bold hover:bg-[#255CC1] transition shadow-xs"
                >
                  Select File from Computer
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Published Connected Page Modal */}
      {isLinksModalOpen && publishedPage && (
        <Modal
          isOpen={true}
          onClose={() => setIsLinksModalOpen(false)}
          title="Page Published Live!"
          description="Your custom landing page is live and connected to the TerraTern Leads Database."
        >
          <div className="space-y-4 pt-1">
            {/* Live URL Bar */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">Live Public Page</span>
                <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                  Status: Live
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveUrl}
                  className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(liveUrl);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 flex-shrink-0 ${
                    copiedLink ? 'bg-emerald-600 text-white' : 'bg-[#00215C] hover:bg-[#255CC1] text-white'
                  }`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-700 rounded-xl transition"
                  title="Open live page in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Campaign UTM Generator */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Generate Tracked Social Link (UTM)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Source</label>
                  <select
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  >
                    <option value="direct">Direct</option>
                    <option value="instagram">Instagram</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Medium</label>
                  <input
                    type="text"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                    placeholder="bio / dm / reel"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Campaign</label>
                  <input
                    type="text"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                    placeholder="spring2026"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={campaignUrl}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-mono text-slate-600 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(campaignUrl);
                    alert('Tracked link copied to clipboard!');
                  }}
                  className="px-3 py-1.5 bg-[#255CC1] text-white rounded-lg text-xs font-bold hover:bg-[#00215C] transition flex-shrink-0"
                >
                  Copy Tracked
                </button>
              </div>
            </div>

            {/* Embed Snippet (For external Webflow / WordPress / custom sites) */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                External Site Universal Script Embed
              </span>
              <div className="flex items-center gap-2">
                <code className="text-[11px] font-mono bg-white p-2 rounded-lg border border-slate-200 flex-1 truncate text-slate-700">
                  {embedScript}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(embedScript);
                    alert('Embed script copied!');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex-shrink-0"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => router.push('/admin/pages')}
                className="px-4 py-2 bg-[#00215C] text-white rounded-xl text-xs font-bold hover:bg-[#255CC1] transition"
              >
                Go to All Pages
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
