import Groq from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

export interface VibeQuestionOption {
  label: string;
  points: number;
}

export interface VibeQuestion {
  id: string;
  question_number: number;
  question: string;
  category?: string;
  options: VibeQuestionOption[];
}

export interface VibePageConfig {
  page_type: 'quiz' | 'lead_magnet' | 'calculator' | 'consultation' | 'custom' | 'landing_page';
  name: string;
  slug_suggestion: string;
  keyword_suggestion: string;
  badge_text: string;
  headline: string;
  subtitle: string;
  cta_text: string;
  theme_accent: 'navy' | 'blue' | 'gold' | 'emerald';
  questions?: VibeQuestion[];
  qualification_threshold?: number;
  max_points?: number;
  result_pass?: {
    headline: string;
    description: string;
    badge: string;
    cta_text: string;
  };
  result_review?: {
    headline: string;
    description: string;
    badge: string;
    cta_text: string;
  };
  lead_magnet?: {
    title: string;
    page_count: number;
    highlights: string[];
    format: string;
  };
  whatsapp_enabled?: boolean;
  whatsapp_message?: string;
  custom_html?: string;
  source_mode?: 'ai_generated' | 'custom_code' | 'template';
}

export function synthesizeCustomHtml(config: VibePageConfig): string {
  if (config.custom_html && config.custom_html.trim().length > 30) {
    return config.custom_html;
  }

  const primaryColor = config.theme_accent === 'emerald' ? '#059669' : config.theme_accent === 'gold' ? '#d97706' : '#255CC1';
  const questionsJson = JSON.stringify(config.questions || []);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.name} | TerraTern Global Mobility</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .brand-navy { background-color: #00215C; }
    .text-navy { color: #00215C; }
    .brand-blue { background-color: #255CC1; }
    .brand-gold { color: #F1C819; }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col">
  <!-- Top Navigation Bar -->
  <header class="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-2xs">
    <div class="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-[#00215C] text-[#F1C819] flex items-center justify-center font-black text-lg">
          T
        </div>
        <div>
          <span class="font-extrabold text-base tracking-tight text-[#00215C]">TerraTern</span>
          <span class="block text-[9px] uppercase tracking-widest font-semibold text-slate-400">Global Mobility</span>
        </div>
      </div>
      <span class="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full">
        ${config.badge_text || 'Official 2026 Assessment'}
      </span>
    </div>
  </header>

  <!-- Hero Section -->
  <main class="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12">
    <div class="text-center mb-8">
      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 mb-3">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Fast-Track Evaluation
      </span>
      <h1 class="text-2xl sm:text-4xl font-black text-[#00215C] tracking-tight leading-snug sm:leading-tight mb-3">
        ${config.headline || config.name}
      </h1>
      <p class="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
        ${config.subtitle || 'Complete this 60-second assessment to check your eligibility benchmark.'}
      </p>
    </div>

    <!-- Interactive Assessment Card -->
    <div id="assessment-container" class="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-8 relative overflow-hidden">
      <!-- Quiz Step View -->
      <div id="quiz-view">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-6 text-xs text-slate-400 font-semibold">
          <span id="question-counter">Question 1 of ${config.questions?.length || 1}</span>
          <span id="score-counter" class="font-mono text-blue-700 font-bold">0 Points</span>
        </div>

        <h2 id="question-text" class="text-lg sm:text-xl font-bold text-slate-900 mb-6">
          ${config.questions?.[0]?.question || 'What is your current profile status?'}
        </h2>

        <div id="options-list" class="space-y-3 mb-6">
          ${(config.questions?.[0]?.options || [
            { label: 'Option 1', points: 4 },
            { label: 'Option 2', points: 2 },
            { label: 'Option 3', points: 0 }
          ]).map((opt, i) => `
            <button type="button" onclick="selectAnswer(0, ${opt.points}, '${opt.label.replace(/'/g, "\\'")}')" class="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition font-medium text-sm flex items-center justify-between group">
              <span>${opt.label}</span>
              <span class="text-xs font-bold text-slate-400 group-hover:text-blue-600">+${opt.points} pts</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Lead Capture Form Step View -->
      <div id="lead-view" class="hidden">
        <div class="text-center mb-6">
          <div class="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold">
            ✓
          </div>
          <h3 class="text-xl font-black text-[#00215C]">Your Preliminary Score: <span id="final-score" class="text-blue-600">0</span> Points</h3>
          <p class="text-xs text-slate-600 mt-1">Enter your details below to receive your detailed roadmap and official eligibility report.</p>
        </div>

        <form id="terrateern-lead-form" onsubmit="handleFormSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Mobile Number (India +91) *</label>
            <input type="tel" id="lead-phone" name="phone" required placeholder="9876543210" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-semibold focus:border-blue-600 focus:outline-none min-h-[48px]" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Full Name *</label>
            <input type="text" id="lead-name" name="name" required placeholder="e.g. Rahul Sharma" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-medium focus:border-blue-600 focus:outline-none min-h-[48px]" />
          </div>

          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Email Address *</label>
            <input type="email" id="lead-email" name="email" required placeholder="name@gmail.com" class="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm font-medium focus:border-blue-600 focus:outline-none min-h-[48px]" />
          </div>

          <label class="flex items-start gap-2 text-xs text-slate-500 pt-1 cursor-pointer">
            <input type="checkbox" id="lead-consent" name="consent" checked required class="mt-0.5 rounded border-slate-300 text-blue-600" />
            <span>I agree to receive my assessment roadmap and consultation via WhatsApp and Email.</span>
          </label>

          <button type="submit" id="submit-btn" class="w-full py-4 rounded-xl font-bold text-white text-sm bg-[#00215C] hover:bg-[#255CC1] active:scale-95 transition shadow-lg mt-2">
            ${config.cta_text || 'Claim Detailed Roadmap & Free Strategy Call'}
          </button>
        </form>
      </div>

      <!-- Result Success View -->
      <div id="result-view" class="hidden py-6 text-center space-y-4">
        <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          🎉
        </div>
        <h3 class="text-2xl font-black text-[#00215C]">${config.result_pass?.headline || 'Assessment Completed!'}</h3>
        <p class="text-sm text-slate-600 max-w-md mx-auto">
          ${config.result_pass?.description || 'Your profile evaluation has been registered. An immigration specialist will connect with your report.'}
        </p>
        <div class="pt-2">
          <a href="https://wa.me/919876543210" target="_blank" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-md">
            <span>Open WhatsApp Consultation</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Trust Badges -->
    <div class="mt-10 grid grid-cols-3 gap-3 text-center border-t border-slate-200/80 pt-6 text-xs text-slate-500">
      <div>
        <span class="block text-base font-black text-[#00215C]">5,000+</span>
        <span>Visas Approved</span>
      </div>
      <div>
        <span class="block text-base font-black text-[#00215C]">98.4%</span>
        <span>Qualification Accuracy</span>
      </div>
      <div>
        <span class="block text-base font-black text-[#00215C]">Licensed</span>
        <span>MARA & German Counsel</span>
      </div>
    </div>
  </main>

  <footer class="w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200 mt-auto bg-white">
    <p>&copy; 2026 TerraTern Global Mobility. All rights reserved. &bull; <a href="#" class="underline">Privacy Policy</a></p>
  </footer>

  <script>
    const questions = ${questionsJson};
    let currentIdx = 0;
    let totalScore = 0;

    function selectAnswer(qIdx, points, label) {
      totalScore += points;
      currentIdx++;

      if (currentIdx < questions.length) {
        document.getElementById('question-counter').innerText = 'Question ' + (currentIdx + 1) + ' of ' + questions.length;
        document.getElementById('score-counter').innerText = totalScore + ' Points';
        document.getElementById('question-text').innerText = questions[currentIdx].question;

        const optionsHtml = questions[currentIdx].options.map((opt) => {
          return '<button type="button" onclick="selectAnswer(' + currentIdx + ', ' + opt.points + ', \\'' + opt.label.replace(/'/g, "\\\\'") + '\\')" class="w-full text-left p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition font-medium text-sm flex items-center justify-between group"><span>' + opt.label + '</span><span class="text-xs font-bold text-slate-400 group-hover:text-blue-600">+' + opt.points + ' pts</span></button>';
        }).join('');

        document.getElementById('options-list').innerHTML = optionsHtml;
      } else {
        document.getElementById('quiz-view').classList.add('hidden');
        document.getElementById('final-score').innerText = totalScore;
        document.getElementById('lead-view').classList.remove('hidden');
      }
    }

    async function handleFormSubmit(e) {
      e.preventDefault();
      const phone = document.getElementById('lead-phone').value;
      const name = document.getElementById('lead-name').value;
      const email = document.getElementById('lead-email').value;
      const consent = document.getElementById('lead-consent').checked;
      const submitBtn = document.getElementById('submit-btn');

      submitBtn.innerText = 'Submitting & Qualifying...';
      submitBtn.disabled = true;

      // URL Attribution (Clean direct by default; captures custom UTM if present)
      const params = new URLSearchParams(window.location.search);
      const utmObj = {};
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) => {
        const v = params.get(k);
        if (v) utmObj[k] = v;
      });

      const payload = {
        phone: phone,
        name: name,
        email: email,
        consent: consent,
        quiz_score: totalScore,
        source: params.get('utm_source') || params.get('src') || params.get('source') || 'direct',
        keyword: params.get('utm_term') || params.get('kw') || params.get('keyword') || null,
        post_id: params.get('utm_content') || params.get('post_id') || null,
        utm: utmObj,
        page_key: window.__TT_PAGE_KEY__ || ''
      };

      try {
        const res = await fetch('/api/v1/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        document.getElementById('lead-view').classList.add('hidden');
        document.getElementById('result-view').classList.remove('hidden');
      } catch (err) {
        document.getElementById('lead-view').classList.add('hidden');
        document.getElementById('result-view').classList.remove('hidden');
      }
    }
  </script>
</body>
</html>`;
}

export interface VibeResponse {
  config: VibePageConfig;
  message: string;
  suggestions: string[];
}

const SYSTEM_PROMPT = `You are TerraTern's Elite Full-Stack Vibe-Coding Engine (operating like Lovable, v0.dev, and Google AI Studio).
TerraTern is a premier global mobility and immigration consultancy (Canada Express Entry & PNP, Germany Opportunity Card, Australia PR, UK Skilled Worker, Schengen, Dubai Golden Visa, USA EB/O-1, Ireland Critical Skills).

YOUR GOAL:
Given any prompt (and optional attached document/code/brief), build a COMPLETE, tailored, modern, high-converting web platform or landing page in full HTML with Tailwind CSS.

KEY CAPABILITIES:
1. You can build ANY KIND of platform or page:
   - Interactive points calculators & immigration eligibility wizards
   - Multi-step qualification quizzes with score counters & calculations
   - High-ticket consultation scheduling pages
   - Real estate & investor visa evaluation portals
   - University / scholarship admission estimators
   - Downloadable PR guide / PDF lead magnets
2. In the generated "custom_html", you MUST provide complete, valid HTML:
   - Include Tailwind CSS CDN (<script src="https://cdn.tailwindcss.com"></script>)
   - Include Google Fonts ('Plus Jakarta Sans')
   - A modern navigation bar with TerraTern logo & live badge
   - A captivating hero section with social proof
   - Rich interactive components matching the user's specific prompt
   - A verified TerraTern Lead Capture form:
     <form id="terrateern-lead-form">
       - Mobile number input (with +91 international formatting)
       - Full name input
       - Email address input
       - Consent checkbox
       - Conversion CTA submit button
     </form>
   - Trust proof (5,000+ approvals, 4.9/5 rating, licensed advisors)
   - Clean responsive footer
3. Always make the design stunning, mobile-first, and ultra-professional.
4. NAMING RULE: The "name" field must be a short, professional, 2-5 word Page Title (e.g. "Dubai Golden Visa Evaluation", "Canada CRS Calculator", "Welcome & PDF Guide"). NEVER name the page after the raw prompt or use instructional phrases like "Make a page...", "Create a...", or "Ask user to fill...".

RESPONSE FORMAT:
You MUST respond with valid JSON ONLY matching this structure:
{
  "config": {
    "name": "Short, professional 2-5 word page title (e.g. 'Canada Express Entry CRS Calculator')",
    "slug_suggestion": "clean-kebab-slug",
    "keyword_suggestion": "UPPERCASE_KEYWORD",
    "badge_text": "Live 2026 Assessment",
    "headline": "Punchy conversion-focused headline",
    "subtitle": "Clear benefit and instructions",
    "cta_text": "Action button text",
    "theme_accent": "blue",
    "page_type": "custom",
    "custom_html": "<!DOCTYPE html><html lang=\\"en\\"><head><meta charset=\\"UTF-8\\"><meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1.0\\"><title>Title</title><script src=\\"https://cdn.tailwindcss.com\\"></script><link href=\\"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap\\" rel=\\"stylesheet\\"><style>body{font-family:'Plus Jakarta Sans',sans-serif;}</style></head><body class=\\"bg-slate-50 text-slate-800 antialiased min-h-screen\\">...full layout with hero, interactive widget, and lead capture form...</body></html>"
  },
  "message": "Friendly explanation of what was designed or modified.",
  "suggestions": ["Follow-up prompt 1", "Follow-up prompt 2", "Follow-up prompt 3"]
}`;

export async function vibeCodePage(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  attachedFile?: { name: string; content: string; type?: string } | null
): Promise<VibeResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  let userPrompt = prompt;
  if (attachedFile && attachedFile.content) {
    userPrompt += `\n\n[ATTACHED FILE: ${attachedFile.name}]\n${attachedFile.content.substring(0, 10000)}`;
  }

  // 1. PRIMARY ENGINE: Google Gemini 3.5 Flash Lite
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      let enrichedPrompt = userPrompt;
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        enrichedPrompt = `Current Page Configuration & Code:\n${JSON.stringify(currentConfig, null, 2)}\n\nUser Revision Request:\n${userPrompt}\n\nUpdate the configuration and custom_html while preserving existing design elements unless the user specifically asked to alter them. Return valid JSON only matching the schema.`;
      }

      // Add recent chat history if available
      let conversationContext = '';
      if (chatHistory && chatHistory.length > 0) {
        conversationContext = chatHistory
          .slice(-4)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n');
      }

      const fullPrompt = `${SYSTEM_PROMPT}\n\n${conversationContext ? `Conversation History:\n${conversationContext}\n\n` : ''}User Prompt:\n${enrichedPrompt}`;

      const res = await ai.models.generateContent({
        model: 'gemini-3.5-flash-lite',
        contents: fullPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      });

      const raw = res.text || '{}';
      const parsed = JSON.parse(raw);

      if (parsed.config && parsed.config.name) {
        parsed.config.name = cleanPageName(parsed.config.name);
        if (!parsed.config.custom_html) {
          parsed.config.custom_html = synthesizeCustomHtml(parsed.config);
        }
        return {
          config: parsed.config,
          message: parsed.message || `Designed ${parsed.config.name} according to your prompt.`,
          suggestions: parsed.suggestions || [
            'Add WhatsApp instant chat button',
            'Change theme accent to luxury gold',
            'Add client testimonial reviews',
          ],
        };
      }
    } catch (err: any) {
      console.warn('Gemini 3.5 Vibe Engine call failed, attempting Groq fallback:', err?.message || err);
    }
  }

  // 2. SECONDARY ENGINE: Groq (qwen/qwen3.8-27b)
  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey, timeout: 20000 });

      const messages: any[] = [{ role: 'system', content: SYSTEM_PROMPT }];

      for (const msg of chatHistory.slice(-4)) {
        messages.push({ role: msg.role, content: msg.content });
      }

      let userMessage = userPrompt;
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        userMessage = `Current Page Configuration & Code:\n${JSON.stringify(currentConfig, null, 2)}\n\nUser Revision Request:\n${userPrompt}\n\nUpdate the configuration and custom_html while preserving existing styling unless asked otherwise. Return valid JSON only.`;
      }

      messages.push({ role: 'user', content: userMessage });

      const completion = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 4000,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      if (parsed.config && parsed.config.name) {
        parsed.config.name = cleanPageName(parsed.config.name);
        if (!parsed.config.custom_html) {
          parsed.config.custom_html = synthesizeCustomHtml(parsed.config);
        }
        return {
          config: parsed.config,
          message: parsed.message || 'Page created successfully according to your specifications.',
          suggestions: parsed.suggestions || [
            'Add client testimonials slider',
            'Make the theme accent emerald',
            'Add a free downloadable PDF checklist',
          ],
        };
      }
    } catch (err: any) {
      console.warn('Groq Vibe Engine failed, attempting Dynamic Heuristic Generator:', err?.message || err);
    }
  }

  // 3. TERTIARY ENGINE: Dynamic Universal Heuristic Generator
  return generateHeuristicPage(userPrompt, currentConfig);
}

// Cleans raw prompts or titles into clean, concise 2-5 word page names
export function cleanPageName(text: string): string {
  if (!text || !text.trim()) return 'Global Mobility Assessment';

  const p = text.toLowerCase().trim();

  // Known program categories
  if (p.includes('dubai') || p.includes('uae')) return 'Dubai Golden Visa Evaluation';
  if (p.includes('germany') || p.includes('chancenkarte') || p.includes('opportunity card')) return 'Germany Opportunity Card Assessment';
  if (p.includes('canada') || p.includes('crs') || p.includes('express entry')) return 'Canada CRS Points Calculator';
  if (p.includes('australia') || p.includes('189') || p.includes('190')) return 'Australia PR Points Assessment';
  if (p.includes('uk') || p.includes('united kingdom') || p.includes('skilled worker')) return 'UK Skilled Worker Assessment';
  if (p.includes('eb-5') || p.includes('eb5') || p.includes('investor')) return 'Investor Visa Consultation';
  if (p.includes('pdf') || p.includes('download') || p.includes('checklist') || p.includes('guide')) {
    return 'PR Roadmap & PDF Guide';
  }
  if (p.includes('welcome') || p.includes('consultation') || p.includes('lead')) {
    return 'Welcome & Consultation Portal';
  }
  if (p.includes('calculator') || p.includes('points') || p.includes('score')) {
    return 'Points & Qualification Calculator';
  }
  if (p.includes('quiz') || p.includes('eligibility') || p.includes('check')) {
    return 'Immigration Eligibility Assessment';
  }

  // Strip prompt filler phrases
  let clean = text
    .replace(/^(please|can you|i want to|create|make|build|design|generate|a|an|the|page|quiz|for|landing|calculator|ask user to|fill name|email and phone|give them|download pdf option|eligibility assessment)\s+/gi, ' ')
    .replace(/(ask user to|fill name|email and phone|give them download pdf option|eligibility assessment)\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length > 36) {
    clean = clean.split(' ').slice(0, 4).join(' ');
  }

  if (!clean || clean.length < 3) return 'Global Immigration Assessment';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

// Built-in Dynamic Universal Heuristic Generator for zero-latency generation of ANY prompt
export function generateHeuristicPage(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>
): VibeResponse {
  const result = _generateHeuristicPageInternal(prompt, currentConfig);
  if (!result.config.custom_html) {
    result.config.custom_html = synthesizeCustomHtml(result.config);
  }
  return result;
}

function _generateHeuristicPageInternal(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>
): VibeResponse {
  const p = prompt.toLowerCase();

  // 1. DUBAI / UAE GOLDEN VISA
  if (p.includes('dubai') || p.includes('uae') || p.includes('golden visa') || p.includes('emirates')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'Dubai 10-Year Golden Visa Eligibility Calculator',
        slug_suggestion: 'dubai-golden-visa-2026',
        keyword_suggestion: 'DUBAI',
        badge_text: 'Official 2026 UAE Golden Visa Assessment',
        headline: 'Check Your Eligibility for the 10-Year Dubai Golden Visa',
        subtitle: 'Verify if your property investment, executive salary, or entrepreneur profile qualifies for 10-year UAE residency.',
        cta_text: 'Evaluate Golden Visa Points Now',
        theme_accent: 'gold',
        qualification_threshold: 6,
        max_points: 10,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'Which qualification pathway best describes your profile?',
            category: 'Category',
            options: [
              { label: 'Real Estate Investor (AED 2M+ Property or Off-Plan)', points: 4 },
              { label: 'Specialized Talent / Executive (AED 30k+ Monthly Salary)', points: 4 },
              { label: 'Entrepreneur / Tech Startup Founder', points: 3 },
              { label: 'General Skilled Professional / Freelancer', points: 1 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'What is your highest educational credential?',
            category: 'Education',
            options: [
              { label: 'Master\'s / Ph.D. or Recognized Professional License', points: 3 },
              { label: 'Bachelor\'s Degree (Ministry Attested)', points: 2 },
              { label: 'Diploma / High School', points: 1 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'What is your intended residency timeline for Dubai?',
            category: 'Timeline',
            options: [
              { label: 'Immediate (Within next 30-90 days)', points: 2 },
              { label: 'Planning for late 2026 intake', points: 1 },
              { label: 'Exploring options for future investment', points: 1 },
            ],
          },
        ],
        result_pass: {
          headline: 'High Likelihood for 10-Year Dubai Golden Visa',
          description: 'Your profile satisfies the key investment or executive criteria established by GDRFA / ICP.',
          badge: 'Golden Visa Eligible',
          cta_text: 'Claim VIP Fast-Track Dubai Roadmap',
        },
        result_review: {
          headline: 'Green Visa or Alternate Residency Recommended',
          description: 'Your profile may be better positioned for the 5-Year Green Visa or Freelance Permit.',
          badge: 'Alternative Pathway',
          cta_text: 'Request Free Dubai Strategy Session',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I just completed the Dubai Golden Visa assessment and would like my roadmap.',
      },
      message: 'Created a high-converting Dubai Golden Visa 2026 eligibility calculator with investment and executive pathways.',
      suggestions: [
        'Add mortgage financing question',
        'Add family sponsorship benefits step',
        'Set accent color to Royal Navy',
      ],
    };
  }

  // 2. UK SKILLED WORKER / PR
  if (p.includes('uk') || p.includes('united kingdom') || p.includes('london') || p.includes('skilled worker')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'UK Skilled Worker Visa Points Assessment',
        slug_suggestion: 'uk-skilled-worker-points-2026',
        keyword_suggestion: 'UKVISA',
        badge_text: 'Home Office 2026 Criteria',
        headline: 'Calculate Your UK Skilled Worker Visa Points',
        subtitle: 'Verify your job offer, minimum salary threshold, and English proficiency against the UK 70-point requirement.',
        cta_text: 'Check UK Points Now',
        theme_accent: 'navy',
        qualification_threshold: 70,
        max_points: 90,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'Do you have a job offer from an approved UK Home Office sponsor?',
            category: 'Sponsorship',
            options: [
              { label: 'Yes, with confirmed Certificate of Sponsorship (CoS)', points: 20 },
              { label: 'Job offer in progress / actively interviewing', points: 10 },
              { label: 'Seeking UK sponsor employer', points: 0 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'Does the job meet the appropriate skill level (RQF 3 or higher)?',
            category: 'Skill Level',
            options: [
              { label: 'Yes, eligible occupation code (Graduate / Professional level)', points: 20 },
              { label: 'Technical / Vocational role', points: 15 },
              { label: 'Unsure of RQF level', points: 5 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'What is your verified English language proficiency?',
            category: 'Language',
            options: [
              { label: 'IELTS for UKVI Level B1 or higher (or UK degree)', points: 10 },
              { label: 'Fluent English, preparing for IELTS', points: 5 },
              { label: 'Basic English only', points: 0 },
            ],
          },
          {
            id: 'q4',
            question_number: 4,
            question: 'Does your proposed salary meet the UK threshold (£38,700 or going rate)?',
            category: 'Salary',
            options: [
              { label: 'Meets or exceeds £38,700 / going rate', points: 20 },
              { label: 'Immigration Salary List (Shortage Occupation discount)', points: 20 },
              { label: 'Under £34,000 threshold', points: 0 },
            ],
          },
        ],
        result_pass: {
          headline: '70+ Points Achieved: UK Visa Ready',
          description: 'You satisfy the mandatory 70-point requirement for the UK Skilled Worker Visa route.',
          badge: 'UK Points Qualified',
          cta_text: 'Download Sponsor Employer List & Book Review',
        },
        result_review: {
          headline: 'Salary or Sponsor Optimization Required',
          description: 'You need an approved Home Office sponsor or salary review to bridge the remaining points.',
          badge: 'Strategy Review',
          cta_text: 'Speak with UK Immigration Specialist',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I checked my UK Skilled Worker points and want to review sponsor options.',
      },
      message: 'Built a UK Skilled Worker points calculator with Home Office 70-point benchmark and salary thresholds.',
      suggestions: [
        'Add STEM PhD points bonus question',
        'Add New Entrant age discount option',
        'Change theme to Sapphire Blue',
      ],
    };
  }

  // 3. AUSTRALIA PR (SUBCLASS 189 / 190)
  if (p.includes('australia') || p.includes('189') || p.includes('190') || p.includes('melbourne') || p.includes('sydney')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'Australia PR Subclass 189/190 Points Calculator',
        slug_suggestion: 'australia-pr-points-calculator-2026',
        keyword_suggestion: 'AUSTRALIA',
        badge_text: 'Department of Home Affairs 2026 Criteria',
        headline: 'Calculate Your Australia PR Points (Subclass 189 & 190)',
        subtitle: 'Evaluate your age, English score (PTE/IELTS), and skilled employment against the 65-point cutoff.',
        cta_text: 'Calculate Australia PR Points',
        theme_accent: 'emerald',
        qualification_threshold: 65,
        max_points: 100,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'What is your current age bracket?',
            category: 'Age',
            options: [
              { label: '25 to 32 years old (Maximum points)', points: 30 },
              { label: '18 to 24 or 33 to 39 years old', points: 25 },
              { label: '40 to 44 years old', points: 15 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'What is your English proficiency score (PTE Academic / IELTS)?',
            category: 'English',
            options: [
              { label: 'Superior English (PTE 79+ / IELTS 8+ in each band)', points: 20 },
              { label: 'Proficient English (PTE 65+ / IELTS 7+ in each band)', points: 10 },
              { label: 'Competent English (PTE 50+ / IELTS 6+ in each band)', points: 0 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'How many years of overseas skilled work experience do you have?',
            category: 'Work Experience',
            options: [
              { label: '8+ years in nominated ANZSCO occupation', points: 15 },
              { label: '5 to 7 years in nominated ANZSCO occupation', points: 10 },
              { label: '3 to 4 years in nominated ANZSCO occupation', points: 5 },
              { label: 'Under 3 years of skilled experience', points: 0 },
            ],
          },
          {
            id: 'q4',
            question_number: 4,
            question: 'What is your highest educational qualification?',
            category: 'Education',
            options: [
              { label: 'Master\'s or Bachelor\'s Degree (Recognized)', points: 15 },
              { label: 'Trade Diploma / Associate Degree', points: 10 },
              { label: 'Doctorate / Ph.D. degree', points: 20 },
            ],
          },
        ],
        result_pass: {
          headline: '65+ Points: Eligible for Australia EOI Invitation',
          description: 'Your estimated points exceed the threshold for Expression of Interest (EOI) submission.',
          badge: 'EOI Ready',
          cta_text: 'Download In-Demand ANZSCO List & Get Strategy',
        },
        result_review: {
          headline: 'State Nomination (Subclass 190) Recommended',
          description: 'State nomination grants +5 bonus points to easily reach the competitive invitation cutoff.',
          badge: 'State Nomination Path',
          cta_text: 'Review State Nomination Options',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I checked my Australia PR score and want to review my ANZSCO skill assessment.',
      },
      message: 'Created an Australia PR Subclass 189/190 points calculator with PTE benchmarks and ANZSCO evaluation.',
      suggestions: [
        'Add partner skills points question',
        'Add regional Australia study bonus (+5 pts)',
        'Change theme to Gold Amber',
      ],
    };
  }

  // 4. GERMANY OPPORTUNITY CARD (CHANCENKARTE)
  if (p.includes('germany') || p.includes('chancenkarte') || p.includes('berlin') || p.includes('opportunity')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'Germany Opportunity Card Points Calculator',
        slug_suggestion: 'germany-opportunity-card-2026',
        keyword_suggestion: 'GERMANY',
        badge_text: 'Official 2026 Immigration Assessment',
        headline: 'Calculate Your Germany Opportunity Card Eligibility Points',
        subtitle: 'Verify your qualification score under the 2026 German Skilled Immigration Act (§ 20a) in under 60 seconds.',
        cta_text: 'Calculate Points & Claim Official Guide',
        theme_accent: 'blue',
        qualification_threshold: 6,
        max_points: 10,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'What is your highest completed educational qualification?',
            category: 'Education',
            options: [
              { label: 'Recognized University Degree (Bachelor/Master)', points: 4 },
              { label: '2-Year Vocational Diploma / Trade Certification', points: 3 },
              { label: 'High School / Secondary Diploma', points: 1 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'How many years of professional work experience do you have in your field?',
            category: 'Experience',
            options: [
              { label: '5+ years of verified professional experience', points: 3 },
              { label: '2 to 5 years of professional experience', points: 2 },
              { label: 'Under 2 years of experience', points: 0 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'What is your current language proficiency in German or English?',
            category: 'Language',
            options: [
              { label: 'German B1/B2 or English C1 (Advanced)', points: 3 },
              { label: 'German A2 or English B2 (Conversational)', points: 2 },
              { label: 'Basic / Beginner conversational only', points: 1 },
            ],
          },
          {
            id: 'q4',
            question_number: 4,
            question: 'What is your current age bracket?',
            category: 'Age',
            options: [
              { label: 'Up to 35 years old', points: 2 },
              { label: '36 to 40 years old', points: 1 },
              { label: '41 years or older', points: 0 },
            ],
          },
        ],
        result_pass: {
          headline: 'Opportunity Card Qualified (6+ Points)',
          description: 'You satisfy the statutory requirements under § 20a to relocate to Germany to seek skilled employment.',
          badge: 'Chancenkarte Eligible',
          cta_text: 'Download Document Checklist & Claim Guidance',
        },
        result_review: {
          headline: 'Pathway Review Recommended (Under 6 Points)',
          description: 'A brief language enhancement (A2 German) or recognized qualification review will bring you over 6 points.',
          badge: 'Enhancement Needed',
          cta_text: 'Speak with German Immigration Specialist',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I scored 6+ points on the Germany Opportunity Card assessment.',
      },
      message: 'Created an accurate Germany Opportunity Card (§ 20a) points assessment matching statutory requirements.',
      suggestions: [
        'Add previous stay in Germany bonus question (+1 pt)',
        'Add spouse qualification bonus (+1 pt)',
        'Change theme to Emerald Green',
      ],
    };
  }

  // 5. CANADA EXPRESS ENTRY & CRS
  if (p.includes('canada') || p.includes('crs') || p.includes('express entry') || p.includes('pnp')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'Canada Express Entry CRS Points Estimator',
        slug_suggestion: 'canada-express-entry-crs-calculator',
        keyword_suggestion: 'CANADA',
        badge_text: 'IRCC 2026 Category-Based Selection',
        headline: 'Calculate Your Canada Express Entry CRS Score',
        subtitle: 'Estimate your Comprehensive Ranking System (CRS) score for 2026 Federal Category-Based and PNP draws.',
        cta_text: 'Estimate My CRS Score Now',
        theme_accent: 'navy',
        qualification_threshold: 450,
        max_points: 600,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'What is your highest completed educational credential?',
            category: 'Education',
            options: [
              { label: 'Master\'s Degree / Professional Degree (ECA evaluated)', points: 126 },
              { label: 'Two or more certificates (one being 3+ years)', points: 119 },
              { label: 'Bachelor\'s Degree (3 or 4-year)', points: 112 },
              { label: 'Post-Secondary Diploma (1 or 2-year)', points: 91 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'What is your target or verified English language score (IELTS / CELPIP)?',
            category: 'Language',
            options: [
              { label: 'CLB 9+ (IELTS Listening 8.0, Reading/Writing/Speaking 7.0)', points: 124 },
              { label: 'CLB 8 (IELTS 7.5 Listening, 6.5 Reading/Writing/Speaking)', points: 92 },
              { label: 'CLB 7 (IELTS 6.0 in all bands)', points: 68 },
              { label: 'Below CLB 7', points: 30 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'What is your current age bracket?',
            category: 'Age',
            options: [
              { label: '20 to 29 years old (Maximum points)', points: 100 },
              { label: '30 to 34 years old', points: 85 },
              { label: '35 to 39 years old', points: 60 },
              { label: '40 years or older', points: 35 },
            ],
          },
          {
            id: 'q4',
            question_number: 4,
            question: 'How many years of continuous skilled foreign work experience do you have?',
            category: 'Experience',
            options: [
              { label: '3+ years in TEER 0, 1, 2, or 3', points: 50 },
              { label: '2 years of skilled experience', points: 35 },
              { label: '1 year of continuous skilled experience', points: 25 },
              { label: 'Under 1 year / Non-continuous', points: 0 },
            ],
          },
        ],
        result_pass: {
          headline: 'Strong Candidate Profile (Estimated CRS 450+)',
          description: 'Your estimated CRS score places you in a competitive tier for Federal Category-Based Draws and Provincial Nominee Programs (PNP).',
          badge: 'Express Entry Competitive',
          cta_text: 'Download 2026 In-Demand NOC List & Claim Assessment',
        },
        result_review: {
          headline: 'CRS Enhancement & PNP Pathway Recommended',
          description: 'Targeting a Provincial Nominee Program (PNP adds +600 points) or French language bonus will be your fastest route.',
          badge: 'PNP Opportunity Identified',
          cta_text: 'Explore Provincial Pathways with RCIC Advisor',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I calculated my Canada CRS score and want to review my PNP options.',
      },
      message: 'Created a Canada Express Entry CRS score calculator with CLB benchmarks and PNP pathway insights.',
      suggestions: [
        'Add Canadian education/work bonus question',
        'Add French language bilingual factor',
        'Change theme to Royal Blue',
      ],
    };
  }

  // 6. DYNAMIC SYNTHESIS FOR ANY CUSTOM TOPIC OR COUNTRY
  // Clean up title to ensure page is named professionally rather than its prompt
  const cleanTitle = cleanPageName(prompt);
  const cleanSlug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);
  const cleanKeyword = cleanSlug.split('-')[0]?.toUpperCase() || 'ASSESS';

  return {
    config: {
      page_type: cleanTitle.toLowerCase().includes('pdf') ? 'lead_magnet' : cleanTitle.toLowerCase().includes('welcome') ? 'consultation' : 'calculator',
      name: cleanTitle,
      slug_suggestion: cleanSlug,
      keyword_suggestion: cleanKeyword,
      badge_text: 'Verified 2026 Immigration Criteria',
      headline: `Check Your Eligibility: ${cleanTitle}`,
      subtitle: `Evaluate your qualifications, timeline, and documentation readiness with TerraTern specialists.`,
      cta_text: 'Calculate Eligibility Score Now',
      theme_accent: 'blue',
      qualification_threshold: 6,
      max_points: 10,
      questions: [
        {
          id: 'q1',
          question_number: 1,
          question: 'What is your primary immigration objective?',
          category: 'Objective',
          options: [
            { label: 'Permanent Residency / Long-term Migration', points: 3 },
            { label: 'Work Permit & Employment Sponsorship', points: 3 },
            { label: 'Study & Post-Graduation Career Pathway', points: 2 },
            { label: 'Business / Investor / Golden Visa', points: 4 },
          ],
        },
        {
          id: 'q2',
          question_number: 2,
          question: 'What is your highest completed educational qualification?',
          category: 'Education',
          options: [
            { label: 'Master\'s Degree or Ph.D.', points: 3 },
            { label: 'Bachelor\'s Degree (4-year / 3-year)', points: 2 },
            { label: 'Vocational Diploma / Certification', points: 1 },
          ],
        },
        {
          id: 'q3',
          question_number: 3,
          question: 'How many years of professional experience do you possess?',
          category: 'Experience',
          options: [
            { label: '5+ years of continuous experience', points: 3 },
            { label: '2 to 5 years of experience', points: 2 },
            { label: '1 to 2 years of experience', points: 1 },
          ],
        },
        {
          id: 'q4',
          question_number: 4,
          question: 'What is your preferred migration timeline?',
          category: 'Timeline',
          options: [
            { label: 'Immediate (Next 3 to 6 months)', points: 1 },
            { label: 'Within the next 12 months', points: 1 },
            { label: 'Long-term planning (1-2 years)', points: 0 },
          ],
        },
      ],
      result_pass: {
        headline: 'High Profile Compatibility',
        description: 'Your background matches current regulatory requirements for direct submission.',
        badge: 'Qualified Profile',
        cta_text: 'Claim Customized Roadmap & Next Steps',
      },
      result_review: {
        headline: 'Profile Optimization Recommended',
        description: 'Reviewing credential attestation and language scoring will strengthen your application.',
        badge: 'Counselor Review',
        cta_text: 'Schedule Confidential Profile Review',
      },
      whatsapp_enabled: true,
      whatsapp_message: `Hi TerraTern, I completed the ${cleanTitle} assessment and would like my roadmap.`,
    },
    message: `Generated a tailored 2026 eligibility assessment for "${cleanTitle}" with custom scoring and qualification criteria.`,
    suggestions: [
      'Add a language test band requirement',
      'Change theme to Royal Navy or Gold',
      'Add a downloadable PDF checklist step',
    ],
  };
}
