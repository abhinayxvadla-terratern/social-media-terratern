'use client';

import React, { useState } from 'react';
import { VibePageConfig } from '@/lib/vibe-engine';
import { TerraTernLogo } from '@/components/ui/TerraTernLogo';
import {
  validateName,
  validateEmailSync,
  validatePhone,
  validateConsent,
} from '@/lib/validation';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Download,
  ShieldCheck,
  ChevronRight,
  BookOpen,
  Award,
  Sparkles,
  RefreshCw,
  PhoneCall,
  Check,
} from 'lucide-react';

interface VibePagePreviewProps {
  config: VibePageConfig;
  onLeadSubmitPreview?: (data: any) => void;
  previewMode?: boolean;
}

export function VibePagePreview({ config, onLeadSubmitPreview, previewMode = true }: VibePagePreviewProps) {
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
  const [submitted, setSubmitted] = useState(false);

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
      // Trigger short calculating animation
      setActiveStep('calculating');
      setTimeout(() => {
        setActiveStep('lead');
      }, 1200);
    }
  };

  const handlePhoneChange = (val: string) => {
    setFormData((prev) => ({ ...prev, phone: val }));
    setTouched((prev) => ({ ...prev, phone: true }));
  };

  const handleEmailChange = (val: string) => {
    setFormData((prev) => ({ ...prev, email: val }));
    setTouched((prev) => ({ ...prev, email: true }));
    const res = validateEmailSync(val);
    setEmailSuggestion(res.suggestion || null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitted(true);
    setActiveStep('result');
    if (onLeadSubmitPreview) {
      onLeadSubmitPreview({
        ...formData,
        score: totalPoints,
        qualified: isQualified,
      });
    }
  };

  // Color theme mappings
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

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 flex flex-col font-sans select-none">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:py-3.5 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <TerraTernLogo size="sm" />
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Verified 2026</span>
          </div>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-5 sm:p-7">
          {/* Top Hero Hook */}
          <div className="text-center mb-6">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border mb-2.5 ${themeClasses.badge}`}
            >
              {config.badge_text || 'Official Immigration Assessment'}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-[#00215C] tracking-tight leading-snug">
              {config.headline || config.name}
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
              {/* STEP: Answering Questions */}
              {activeStep === 'quiz' && currentQ && (
                <div className="space-y-4">
                  {/* Progress Header */}
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

                  <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug pt-1">
                    {currentQ.question}
                  </h2>

                  {/* Question Options */}
                  <div className="space-y-2">
                    {currentQ.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswers[currentQ.question_number]?.label === opt.label;
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.question_number, opt)}
                          className={`w-full p-3.5 sm:p-4 rounded-xl border text-left transition text-sm flex items-center justify-between min-h-[48px] ${
                            isSelected
                              ? themeClasses.borderActive
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <span className="leading-snug pr-2 font-medium">{opt.label}</span>
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

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-2">
                    {activeQuestionIdx > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveQuestionIdx(activeQuestionIdx - 1)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                      >
                        ← Previous
                      </button>
                    ) : (
                      <div></div>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveStep('lead')}
                      className={`text-xs font-bold hover:underline ${themeClasses.accentText}`}
                    >
                      Skip to results →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP: Calculating Profile Loader */}
              {activeStep === 'calculating' && (
                <div className="py-12 text-center space-y-4">
                  <div className="w-12 h-12 border-3 border-[#255CC1] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <h3 className="text-base font-bold text-slate-900">
                    Evaluating immigration benchmarks...
                  </h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Matching your qualifications against current regulatory criteria and point thresholds.
                  </p>
                </div>
              )}

              {/* STEP: Gated Lead Capture Form */}
              {activeStep === 'lead' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Points Banner */}
                  <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs text-[#00215C]">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#255CC1]" />
                      <span className="font-semibold">Your Preliminary Points:</span>
                    </div>
                    <span className="font-black text-sm text-[#255CC1]">
                      {totalPoints} Points
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 text-center font-medium">
                    Enter your contact details below to unlock your full eligibility breakdown and immigration strategy roadmap.
                  </p>

                  {/* Mobile Number (Phone First) */}
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
                        className={`w-full pl-12 pr-10 py-2.5 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[44px] ${
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

                  {/* Full Name */}
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
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[44px] ${
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
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@gmail.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[44px] ${
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
                      className="mt-0.5 rounded border-slate-300 text-[#255CC1] focus:ring-0 w-4 h-4"
                    />
                    <span>
                      I authorize TerraTern to evaluate my eligibility and contact me regarding immigration pathways.
                    </span>
                  </label>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid
                        ? themeClasses.btn
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <span>{config.cta_text || 'Unlock My Full Points & Report'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}

              {/* STEP: Result Screen */}
              {activeStep === 'result' && (
                <div className="space-y-5 text-center">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
                      isQualified ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-[#255CC1]'
                    }`}
                  >
                    <Award className="w-7 h-7" />
                  </div>

                  <div>
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border mb-2 ${
                        isQualified
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isQualified
                        ? config.result_pass?.badge || 'Threshold Qualified'
                        : config.result_review?.badge || 'Pathway In Review'}
                    </span>
                    <h2 className="text-lg font-black text-[#00215C]">
                      {isQualified
                        ? config.result_pass?.headline || 'High Eligibility Confirmed'
                        : config.result_review?.headline || 'Score Assessment Complete'}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
                      {isQualified
                        ? config.result_pass?.description || 'Your profile qualifies for direct immigration consideration.'
                        : config.result_review?.description || 'Your profile is close to the threshold. A strategic review is advised.'}
                    </p>
                  </div>

                  {/* Score Breakdown Box */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Calculated Points Score:</span>
                      <span className="text-sm font-black text-[#00215C]">{totalPoints} Points</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Minimum Target Threshold:</span>
                      <span>{threshold} Points</span>
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 ${themeClasses.btn}`}
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {isQualified
                          ? config.result_pass?.cta_text || 'Download Official Guide & Checklist'
                          : config.result_review?.cta_text || 'Request Strategy Consultation'}
                      </span>
                    </button>

                    {config.whatsapp_enabled && (
                      <button
                        type="button"
                        className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
                      >
                        <span>Send Result via WhatsApp</span>
                      </button>
                    )}
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
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        className={`w-full pl-12 pr-10 py-2.5 rounded-xl border text-sm font-medium transition focus:outline-none min-h-[44px] ${
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

                  {/* Full Name */}
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[44px]"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[44px]"
                    />
                  </div>

                  {/* Consent */}
                  <label className="flex items-start gap-2.5 pt-1 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consent}
                      onChange={(e) => setFormData((prev) => ({ ...prev, consent: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-300 text-[#255CC1] w-4 h-4"
                    />
                    <span>I agree to receive the document and immigration pathway updates.</span>
                  </label>

                  {/* Claim Button */}
                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid ? themeClasses.btn : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{config.cta_text || 'Claim Instant Download Now'}</span>
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-[#00215C]">Your Guide is Ready!</h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Click below to open your signed 10-minute download link. A copy has also been queued for WhatsApp.
                  </p>
                  <button
                    type="button"
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 ${themeClasses.btn}`}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF Document (10 min link)</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* ARCHETYPE 3: CONSULTATION INQUIRY FLOW                   */}
          {/* ======================================================== */}
          {config.page_type === 'consultation' && (
            <div>
              {!submitted ? (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        className="w-full pl-12 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[44px]"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[44px]"
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium focus:border-[#255CC1] focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isFormValid}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 mt-2 ${
                      isFormValid ? themeClasses.btn : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>{config.cta_text || 'Schedule Confidential Strategy Call'}</span>
                  </button>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-black text-[#00215C]">Consultation Request Received!</h3>
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
