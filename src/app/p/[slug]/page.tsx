'use client';

import React, { useState, useEffect, use } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { TerraTernLogo } from '@/components/ui/TerraTernLogo';
import {
  validateName,
  validateEmailSync,
  validatePhone,
  validateConsent,
} from '@/lib/validation';
import { VibePageConfig } from '@/lib/vibe-engine';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  Award,
  ChevronRight,
  BookOpen,
  PhoneCall,
  Check,
} from 'lucide-react';

interface DynamicPageProps {
  params: Promise<{ slug: string }>;
}

export default function NativePublicLandingPage({ params }: DynamicPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tracking params parsed from URL
  const [tracking, setTracking] = useState<{
    source: string;
    keyword: string | null;
    postId: string | null;
    utm: Record<string, string>;
  }>({
    source: 'direct',
    keyword: null,
    postId: null,
    utm: {},
  });

  // Step state for quiz / calculator
  const [activeStep, setActiveStep] = useState<'quiz' | 'calculating' | 'lead' | 'result'>('quiz');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, { label: string; points: number }>>({});

  // Form state
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    email: '',
    consent: true,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [emailSuggestion, setEmailSuggestion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // Parse URL query params and load page details
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const utmObj: Record<string, string> = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
        const val = urlParams.get(k);
        if (val) utmObj[k] = val;
      });

      setTracking({
        source: urlParams.get('utm_source') || urlParams.get('src') || urlParams.get('source') || 'direct',
        keyword: urlParams.get('utm_term') || urlParams.get('kw') || urlParams.get('keyword') || null,
        postId: urlParams.get('utm_content') || urlParams.get('post_id') || urlParams.get('post') || null,
        utm: utmObj,
      });
    }

    async function loadPage() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/pages/status?slug=${slug}`);
        const data = await res.json();
        if (res.ok && data) {
          setPage(data);
          const cfg = data.config as VibePageConfig;
          if (cfg?.page_type === 'lead_magnet' || cfg?.page_type === 'consultation') {
            setActiveStep('lead');
          }
        } else {
          setError(data.error || 'Page not found');
        }
      } catch {
        setError('Failed to load page');
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [slug]);

  const config: VibePageConfig = page?.config || {
    page_type: 'calculator',
    name: page?.name || 'Immigration Assessment',
    headline: page?.name || 'Immigration Assessment',
    subtitle: 'Verify your eligibility benchmarks with TerraTern specialists.',
    cta_text: 'Check Eligibility Now',
    theme_accent: 'blue',
  };

  const questions = config.questions || [];
  const currentQ = questions[activeQuestionIdx];
  const totalPoints = Object.values(selectedAnswers).reduce((sum, item) => sum + (item.points || 0), 0);
  const threshold = config.qualification_threshold || 6;
  const isQualified = totalPoints >= threshold;

  // Validation
  const phoneRes = validatePhone(formData.phone, 'IN');
  const nameRes = validateName(formData.name);
  const emailRes = validateEmailSync(formData.email);
  const consentRes = validateConsent(formData.consent);

  const isFormValid = phoneRes.valid && nameRes.valid && emailRes.valid && consentRes.valid;

  const handleSelectOption = (qNum: number, opt: { label: string; points: number }) => {
    const updated = { ...selectedAnswers, [qNum]: opt };
    setSelectedAnswers(updated);

    if (activeQuestionIdx < questions.length - 1) {
      setActiveQuestionIdx(activeQuestionIdx + 1);
    } else {
      setActiveStep('calculating');
      setTimeout(() => {
        setActiveStep('lead');
      }, 1200);
    }
  };

  const handlePhoneChange = (val: string) => {
    setFormData((prev) => ({ ...prev, phone: val }));
    setTouched((prev) => ({ ...prev, phone: true }));

    const check = validatePhone(val, 'IN');
    if (check.valid && typeof window !== 'undefined' && (window as any).TTConnector) {
      (window as any).TTConnector.trackPartial({
        phone: check.e164,
        name: formData.name || 'Visitor',
      });
    }
  };

  const handleEmailChange = (val: string) => {
    setFormData((prev) => ({ ...prev, email: val }));
    setTouched((prev) => ({ ...prev, email: true }));
    const res = validateEmailSync(val);
    setEmailSuggestion(res.suggestion || null);
  };

  const handleSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting || !page) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_key: page.page_key,
          visitor_id:
            typeof window !== 'undefined' && (window as any).TTConnector
              ? (window as any).TTConnector.visitorId
              : 'vis_' + Date.now(),
          phone: phoneRes.e164,
          name: nameRes.cleanedName,
          email: emailRes.cleanedEmail,
          country_code: 'IN',
          consent: true,
          quiz_score: totalPoints,
          quiz_result: isQualified ? 'Qualified / High Match' : 'Pathway Review Recommended',
          source: tracking.source || 'direct',
          keyword: tracking.keyword || null,
          post_id: tracking.postId || null,
          utm: tracking.utm || {},
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitResult(data);
        setActiveStep('result');
      } else {
        alert(data.error || 'Submission failed. Please try again.');
      }
    } catch {
      alert('A network error occurred. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Theme styling
  const themeClasses = {
    navy: {
      badge: 'bg-[#00215C]/10 text-[#00215C] border-[#00215C]/20',
      btn: 'bg-[#00215C] hover:bg-[#001844] text-white',
      accentText: 'text-[#00215C]',
      borderActive: 'border-[#00215C] bg-[#00215C]/5',
    },
    blue: {
      badge: 'bg-blue-50 text-[#255CC1] border-blue-200/80',
      btn: 'bg-[#255CC1] hover:bg-[#1d4aa1] text-white',
      accentText: 'text-[#255CC1]',
      borderActive: 'border-[#255CC1] bg-blue-50/50 ring-2 ring-blue-100',
    },
    gold: {
      badge: 'bg-amber-50 text-amber-900 border-amber-200/80',
      btn: 'bg-[#F1C819] hover:bg-[#e0b80f] text-slate-900 font-black',
      accentText: 'text-amber-700',
      borderActive: 'border-[#F1C819] bg-amber-50/60 ring-2 ring-amber-100',
    },
    emerald: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      btn: 'bg-[#3CBD2C] hover:bg-[#34a826] text-white',
      accentText: 'text-emerald-700',
      borderActive: 'border-[#3CBD2C] bg-emerald-50/50 ring-2 ring-emerald-100',
    },
  }[config.theme_accent || 'blue'];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#255CC1] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-semibold text-slate-500">Loading verified assessment...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-xs">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Assessment Not Found</h2>
          <p className="text-xs text-slate-500 mb-5">{error || 'This page does not exist or has been archived.'}</p>
          <a
            href="https://terratern.com"
            className="inline-block px-5 py-2.5 rounded-xl bg-[#00215C] text-white text-xs font-bold"
          >
            Visit TerraTern Home
          </a>
        </div>
      </div>
    );
  }

  if (!page.live) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center shadow-xs">
          <TerraTernLogo size="md" className="justify-center mb-6" />
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#00215C] mb-2">Assessment Temporarily Paused</h2>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            {page.closed_message || 'This immigration assessment is currently paused for updates.'}
          </p>
          <a
            href={page.closed_redirect_url || 'https://terratern.com'}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-[#00215C] text-white text-xs font-bold hover:bg-[#255CC1] transition"
          >
            <span>Visit Main Portal</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  // Render Full Custom Platform / HTML Page if configured
  if (config.custom_html && config.custom_html.trim().length > 30) {
    let finalHtml = config.custom_html;
    const originUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const scriptSrc = originUrl ? `${originUrl}/connect.js` : '/connect.js';

    const downloadEndpoint = page.pdf_download_url
      ? (page.pdf_download_url.startsWith('http') ? page.pdf_download_url : `${originUrl}${page.pdf_download_url}`)
      : (page.has_pdf ? `${originUrl}/api/v1/download?slug=${page.slug}` : '');

    const injection = `
      <script>
        window.__TT_PAGE_KEY__ = "${page.page_key}";
        window.__TT_PAGE_SLUG__ = "${page.slug}";
        window.__TT_API_HOST__ = "${originUrl}";
        window.__TT_DOWNLOAD_URL__ = "${downloadEndpoint}";
        window.__TT_HAS_PDF__ = ${Boolean(page.has_pdf)};
      </script>
      <script src="${scriptSrc}" data-page-key="${page.page_key}" async></script>
    `;

    // Inject base href so relative assets, styles, scripts and API requests resolve accurately
    if (originUrl) {
      if (finalHtml.includes('<head>')) {
        finalHtml = finalHtml.replace('<head>', `<head><base href="${originUrl}/">`);
      } else if (finalHtml.includes('<html>')) {
        finalHtml = finalHtml.replace('<html>', `<html><head><base href="${originUrl}/"></head>`);
      } else {
        finalHtml = `<base href="${originUrl}/">` + finalHtml;
      }
    }

    if (finalHtml.includes('</body>')) {
      finalHtml = finalHtml.replace('</body>', `${injection}</body>`);
    } else {
      finalHtml += injection;
    }

    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col">
        <iframe
          srcDoc={finalHtml}
          title={page.name || "Assessment"}
          className="w-full min-h-screen flex-1 border-0"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Connector Script */}
      {page.page_key && (
        <Script
          src="/connect.js"
          data-page-key={page.page_key}
          strategy="afterInteractive"
        />
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 sm:py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <TerraTernLogo size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Verified 2026</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-6 sm:p-8">
          {/* Top Hero Hook */}
          <div className="text-center mb-6">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border mb-2.5 ${themeClasses.badge}`}
            >
              {config.badge_text || 'Official Immigration Assessment'}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#00215C] tracking-tight leading-tight">
              {config.headline || page.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {config.subtitle}
            </p>
          </div>

          {/* ======================================================== */}
          {/* ARCHETYPE 1: GAMIFIED MCQ / CALCULATOR FLOW               */}
          {/* ======================================================== */}
          {(config.page_type === 'quiz' || config.page_type === 'calculator') && (
            <div>
              {/* Question Screen */}
              {activeStep === 'quiz' && currentQ && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-100 pb-2">
                    <span>
                      Question {activeQuestionIdx + 1} of {questions.length}
                    </span>
                    {totalPoints > 0 && (
                      <span className={`font-bold ${themeClasses.accentText}`}>
                        Current Points: {totalPoints} pts
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#255CC1] h-full transition-all duration-300"
                      style={{
                        width: `${((activeQuestionIdx + 1) / questions.length) * 100}%`,
                      }}
                    ></div>
                  </div>

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h2>

                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[currentQ.question_number]?.label === opt.label;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.question_number, opt)}
                          className={`w-full p-4 rounded-xl border text-left transition text-sm flex items-center justify-between min-h-[52px] ${
                            isSelected
                              ? themeClasses.borderActive
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="leading-snug pr-3 font-medium">{opt.label}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {opt.points > 0 && (
                              <span className="text-xs font-bold text-slate-400">
                                +{opt.points} pts
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {activeQuestionIdx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveQuestionIdx(activeQuestionIdx - 1)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        ← Previous Question
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveStep('lead')}
                      className={`text-xs font-bold hover:underline ${themeClasses.accentText}`}
                    >
                      Skip to form →
                    </button>
                  </div>
                </div>
              )}

              {/* Calculating Animation */}
              {activeStep === 'calculating' && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 border-3 border-[#255CC1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h3 className="text-base font-bold text-slate-900">
                    Evaluating immigration criteria...
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Scoring profile benchmarks against current regulatory standards and thresholds.
                  </p>
                </div>
              )}

              {/* Gated Lead Form */}
              {activeStep === 'lead' && (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div className="p-3.5 bg-blue-50 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-[#00215C]">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#255CC1]" />
                      <span className="font-semibold">Your Preliminary Points:</span>
                    </div>
                    <span className="font-black text-sm text-[#255CC1]">
                      {totalPoints} Points
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 text-center font-medium">
                    Enter your contact details to reveal your full points breakdown and personalized visa strategy report.
                  </p>

                  {/* Phone First */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (India +91) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={14}
                        className={`w-full pl-12 pr-10 py-3 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[48px] ${
                          touched.phone
                            ? phoneRes.valid
                              ? 'border-emerald-500 bg-emerald-50/20'
                              : 'border-red-400 bg-red-50/20'
                            : 'border-slate-300 focus:border-[#255CC1]'
                        }`}
                      />
                      {touched.phone && (
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          {phoneRes.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {touched.phone && !phoneRes.valid && (
                      <p className="text-xs text-red-600 mt-1">{phoneRes.error}</p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        setTouched((prev) => ({ ...prev, name: true }));
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[48px] ${
                        touched.name
                          ? nameRes.valid
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : 'border-red-400 bg-red-50/20'
                          : 'border-slate-300 focus:border-[#255CC1]'
                      }`}
                    />
                    {touched.name && !nameRes.valid && (
                      <p className="text-xs text-red-600 mt-1">{nameRes.error}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@gmail.com"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[48px] ${
                        touched.email
                          ? emailRes.valid
                            ? 'border-emerald-500 bg-emerald-50/20'
                            : 'border-red-400 bg-red-50/20'
                          : 'border-slate-300 focus:border-[#255CC1]'
                      }`}
                    />
                    {emailSuggestion && (
                      <p className="text-xs text-amber-700 mt-1">
                        Did you mean{' '}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, email: emailSuggestion }));
                            setEmailSuggestion(null);
                          }}
                          className="font-bold underline text-amber-900"
                        >
                          {emailSuggestion}
                        </button>
                        ?
                      </p>
                    )}
                    {touched.email && !emailRes.valid && (
                      <p className="text-xs text-red-600 mt-1">{emailRes.error}</p>
                    )}
                  </div>

                  {/* Consent */}
                  <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#255CC1] w-4 h-4"
                    />
                    <span>
                      I authorize TerraTern to evaluate my eligibility and contact me regarding immigration pathways.
                    </span>
                  </label>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-4 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid && !isSubmitting
                        ? themeClasses.btn
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>
                      {isSubmitting
                        ? 'Verifying & Submitting...'
                        : config.cta_text || 'Unlock My Full Points & Report'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* Result Screen */}
              {activeStep === 'result' && (
                <div className="space-y-6 text-center">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                      isQualified ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#255CC1]'
                    }`}
                  >
                    <Award className="w-8 h-8" />
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border mb-2.5 ${
                        isQualified
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isQualified
                        ? config.result_pass?.badge || 'Threshold Qualified'
                        : config.result_review?.badge || 'Pathway In Review'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-[#00215C]">
                      {isQualified
                        ? config.result_pass?.headline || 'High Eligibility Confirmed'
                        : config.result_review?.headline || 'Score Assessment Complete'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                      {isQualified
                        ? config.result_pass?.description || 'Your profile qualifies for direct immigration consideration.'
                        : config.result_review?.description || 'Your profile is close to the threshold. A strategic review is advised.'}
                    </p>
                  </div>

                  {/* Score breakdown card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Calculated Points Score:</span>
                      <span className="text-base font-black text-[#00215C]">{totalPoints} Points</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Target Benchmark Threshold:</span>
                      <span>{threshold} Points</span>
                    </div>
                  </div>

                  {/* Download Token if PDF attached */}
                  {submitResult?.download_url && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Official PDF Guide Ready for Download</span>
                      </div>
                      <a
                        href={submitResult.download_url}
                        className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Verified Guide (Valid 10 Minutes)</span>
                      </a>
                    </div>
                  )}

                  {/* Strategy Session CTA */}
                  <div className="space-y-2 pt-1">
                    <a
                      href="https://wa.me/919876543210?text=Hi%20TerraTern,%20I%20completed%20the%20eligibility%20assessment"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-[#00215C] hover:bg-[#255CC1] text-white font-bold text-xs transition shadow-xs"
                    >
                      <span>Connect with Senior Immigration Advisor</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ARCHETYPE 2: DOCUMENT LEAD MAGNET FLOW                   */}
          {/* ======================================================== */}
          {config.page_type === 'lead_magnet' && (
            <div>
              {activeStep !== 'result' ? (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  {/* Document Preview Card */}
                  {config.lead_magnet && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center gap-2.5 text-xs font-bold text-[#00215C]">
                        <BookOpen className="w-4 h-4 text-[#255CC1]" />
                        <span>{config.lead_magnet.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold">
                        <span>{config.lead_magnet.page_count} Pages</span>
                        <span>&bull;</span>
                        <span>{config.lead_magnet.format || 'Verified PDF'}</span>
                      </div>
                      {config.lead_magnet.highlights?.length > 0 && (
                        <ul className="space-y-1.5 pt-1 text-xs text-slate-600">
                          {config.lead_magnet.highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span className="leading-snug">{h}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Mobile Number */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (India +91) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={14}
                        className={`w-full pl-12 pr-10 py-3 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[48px] ${
                          touched.phone
                            ? phoneRes.valid
                              ? 'border-emerald-500 bg-emerald-50/20'
                              : 'border-red-400 bg-red-50/20'
                            : 'border-slate-300 focus:border-[#255CC1]'
                        }`}
                      />
                      {touched.phone && (
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                          {phoneRes.valid ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {touched.phone && !phoneRes.valid && (
                      <p className="text-xs text-red-600 mt-1">{phoneRes.error}</p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, name: e.target.value }));
                        setTouched((prev) => ({ ...prev, name: true }));
                      }}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[48px]"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[48px]"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#255CC1] w-4 h-4"
                    />
                    <span>I agree to receive the document and immigration pathway updates.</span>
                  </label>

                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-4 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid && !isSubmitting
                        ? themeClasses.btn
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{isSubmitting ? 'Preparing Download...' : config.cta_text || 'Claim Instant Download Now'}</span>
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-[#00215C]">Your Guide is Ready!</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Click below to open your signed 10-minute download link.
                  </p>
                  {submitResult?.download_url ? (
                    <a
                      href={submitResult.download_url}
                      className={`inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition ${themeClasses.btn}`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Download PDF Document (10 min link)</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-blue-50 text-[#00215C] rounded-xl text-xs font-semibold">
                      Your request has been registered. An advisor will forward your copy.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ARCHETYPE 3: CONSULTATION INQUIRY FLOW                   */}
          {/* ======================================================== */}
          {config.page_type === 'consultation' && (
            <div>
              {activeStep !== 'result' ? (
                <form onSubmit={handleSubmitLead} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Mobile Number (India +91) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                        +91
                      </div>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="98765 43210"
                        maxLength={14}
                        className="w-full pl-12 pr-10 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[48px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[48px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[48px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className={`w-full py-4 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid && !isSubmitting ? themeClasses.btn : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>{isSubmitting ? 'Scheduling...' : config.cta_text || 'Schedule Strategy Consultation'}</span>
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-black text-[#00215C]">Consultation Request Received!</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    A licensed immigration counselor from TerraTern will contact you within 24 hours.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
