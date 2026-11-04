'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Key,
  Code2,
  Activity,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Modal } from './Modal';
import { Page, PageType } from '@/lib/types';
import { generateUniqueSlug, generatePageKey } from '@/lib/utils';

interface ConnectPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSlugs: string[];
  onSavePage: (pageData: Partial<Page>) => Promise<Page>;
  onEditPage?: (page: Page) => void;
}

export function ConnectPageModal({
  isOpen,
  onClose,
  existingSlugs,
  onSavePage,
  onEditPage,
}: ConnectPageModalProps) {
  const [step, setStep] = useState<'form' | 'card'>('form');
  const [activeSnippetTab, setActiveSnippetTab] = useState<'html' | 'react' | 'rest'>('html');

  // Form Fields
  const [name, setName] = useState('');
  const [pageType, setPageType] = useState<PageType>('quiz');
  const [keyword, setKeyword] = useState('');
  const [webAddress, setWebAddress] = useState('');

  // Created Page Data
  const [createdPage, setCreatedPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Connection Tester State
  const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [pingMessage, setPingMessage] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setPageType('quiz');
    setKeyword('');
    setWebAddress('');
    setCreatedPage(null);
    setStep('form');
    setPingStatus('idle');
    setPingMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const slug = generateUniqueSlug(name, existingSlugs);
      const pageKey = generatePageKey();

      const allowedOrigins: string[] = [];
      if (webAddress.trim()) {
        try {
          const parsed = new URL(
            webAddress.startsWith('http') ? webAddress : `https://${webAddress}`
          );
          allowedOrigins.push(parsed.origin);
        } catch {
          allowedOrigins.push(webAddress.trim());
        }
      }

      const newPagePayload: Partial<Page> = {
        name: name.trim(),
        slug,
        page_type: pageType,
        status: 'live',
        keyword: keyword.trim() || null,
        page_url: webAddress.trim() || null,
        page_key: pageKey,
        allowed_origins: allowedOrigins,
        closed_message: 'This assessment is currently closed. Please contact our advisory team.',
        closed_redirect_url: allowedOrigins[0] || 'https://terratern.com',
      };

      const saved = await onSavePage(newPagePayload);
      setCreatedPage(saved);
      setStep('card');
    } catch {
      alert('Failed to connect page. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!createdPage) return;
    setPingStatus('checking');
    try {
      const res = await fetch(`/api/v1/pages/status?key=${createdPage.page_key}`);
      const data = await res.json();
      if (res.ok && data.live) {
        setPingStatus('success');
        setPingMessage('Connection Healthy! Engine is actively receiving events.');
      } else {
        setPingStatus('error');
        setPingMessage(data.error || 'Connection failed: Page is not live.');
      }
    } catch {
      setPingStatus('error');
      setPingMessage('Failed to reach server endpoint.');
    }
  };

  const snippetDomain = typeof window !== 'undefined' ? window.location.origin : 'https://terratern.com';

  const htmlSnippet = createdPage
    ? `<!-- TerraTern Lead Engine Integration -->
<script
  src="${snippetDomain}/connect.js"
  data-page-key="${createdPage.page_key}"
  async
></script>

<!-- Add this form or use your existing Webflow/Framer form -->
<form id="terrateern-lead-form">
  <input type="tel" name="phone" placeholder="Mobile Number (+91)" required />
  <input type="text" name="name" placeholder="Full Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="checkbox" name="consent" checked required />
  <button type="submit" disabled>Submit Assessment</button>
</form>`
    : '';

  const reactSnippet = createdPage
    ? `import { useEffect } from 'react';

export default function LeadPage() {
  useEffect(() => {
    const s = document.createElement('script');
    s.src = '${snippetDomain}/connect.js';
    s.setAttribute('data-page-key', '${createdPage.page_key}');
    s.async = true;
    document.body.appendChild(s);
  }, []);

  return (
    <form id="terrateern-lead-form">
      {/* Phone-first recommended for highest conversion */}
      <input type="tel" name="phone" placeholder="Mobile (+91)" required />
      <input type="text" name="name" placeholder="Full Name" required />
      <input type="email" name="email" placeholder="Email" required />
      <input type="checkbox" name="consent" defaultChecked required />
      <button type="submit">Submit</button>
    </form>
  );
}`
    : '';

  const restSnippet = createdPage
    ? `# Submit complete applicant lead via REST API
curl -X POST ${snippetDomain}/api/v1/leads \\
  -H "Content-Type: application/json" \\
  -d '{
    "page_key": "${createdPage.page_key}",
    "visitor_id": "vis_user_123",
    "phone": "+919876543210",
    "name": "Applicant Name",
    "email": "applicant@gmail.com",
    "country_code": "IN",
    "consent": true
  }'`
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'form' ? 'Connect External Landing Page' : 'Connection Details & Embed Snippet'}
    >
      {step === 'form' ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Connect any external page (Webflow, WordPress, Framer, Carrd, Custom HTML) to receive real-time applicant inquiries, funnel analytics, and automated PDF downloads.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Page / Assessment Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Germany Opportunity Card Points Calculator"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#255CC1]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Program Type *
              </label>
              <select
                value={pageType}
                onChange={(e) => setPageType(e.target.value as PageType)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#255CC1]"
              >
                <option value="quiz">Points Calculator / Quiz</option>
                <option value="lead_pdf">Immigration Guide / PDF Magnet</option>
                <option value="welcome">Consultation Booking</option>
                <option value="other">General Assessment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Keyword Tag (Optional)
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Opportunity Card, Express Entry"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#255CC1]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              External Page Web Address *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={webAddress}
                onChange={(e) => setWebAddress(e.target.value)}
                placeholder="https://promo.terratern.com/germany-card"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#255CC1]"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              This domain will be automatically authorized under Allowed Origins for secure event submission.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !webAddress.trim()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00215C] hover:bg-[#255CC1] text-white transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                'Connecting...'
              ) : (
                <>
                  <span>Create & Generate Snippet</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        /* Step 2: Connection Card */
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Page connected successfully! Status is Live.</span>
            </div>
            <button
              onClick={testConnection}
              disabled={pingStatus === 'checking'}
              className="px-2.5 py-1 bg-white border border-emerald-300 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3 h-3 ${pingStatus === 'checking' ? 'animate-spin' : ''}`} />
              <span>Test Ping</span>
            </button>
          </div>

          {pingMessage && (
            <div
              className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                pingStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {pingStatus === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" />
              )}
              <span>{pingMessage}</span>
            </div>
          )}

          {/* Key Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Generated Slug
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                  {createdPage?.slug}
                </span>
                <button
                  onClick={() => handleCopy(createdPage?.slug || '', 'slug')}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copiedField === 'slug' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Public Page Key
              </span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                  {createdPage?.page_key.slice(0, 16)}...
                </span>
                <button
                  onClick={() => handleCopy(createdPage?.page_key || '', 'key')}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  {copiedField === 'key' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Snippet Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setActiveSnippetTab('html')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeSnippetTab === 'html' ? 'bg-white text-[#00215C] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  One-Tag HTML
                </button>
                <button
                  onClick={() => setActiveSnippetTab('react')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeSnippetTab === 'react' ? 'bg-white text-[#00215C] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  React / Next.js
                </button>
                <button
                  onClick={() => setActiveSnippetTab('rest')}
                  className={`px-3 py-1 rounded-md transition ${
                    activeSnippetTab === 'rest' ? 'bg-white text-[#00215C] shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Direct REST API
                </button>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    activeSnippetTab === 'html'
                      ? htmlSnippet
                      : activeSnippetTab === 'react'
                      ? reactSnippet
                      : restSnippet,
                    'snippet'
                  )
                }
                className="text-xs font-bold text-[#255CC1] hover:underline flex items-center gap-1"
              >
                {copiedField === 'snippet' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy Snippet
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono rounded-xl overflow-x-auto max-h-56 leading-relaxed">
              {activeSnippetTab === 'html'
                ? htmlSnippet
                : activeSnippetTab === 'react'
                ? reactSnippet
                : restSnippet}
            </pre>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-400">Allowed Origin: {createdPage?.allowed_origins?.[0] || 'Any'}</span>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00215C] hover:bg-[#255CC1] text-white transition"
            >
              Done & View in Dashboard
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
