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
  page_type: 'quiz' | 'lead_magnet' | 'calculator' | 'consultation';
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
}

export interface VibeResponse {
  config: VibePageConfig;
  message: string;
  suggestions: string[];
}

const SYSTEM_PROMPT = `You are TerraTern's AI Landing Page Architect and Vibe-Coder.
TerraTern is a premier global mobility and immigration consultancy (Canada Express Entry & PNP, Germany Opportunity Card, Australia PR, UK Skilled Worker, Schengen, Dubai Golden Visa, USA EB/O-1, Ireland Critical Skills).
Your job is to generate and iteratively refine high-converting, mobile-first lead capture assessment pages based on user prompts.

BRAND IDENTITY & STYLING TOKENS:
- Brand Deep Navy: #00215C (accent: 'navy')
- Brand Royal Blue: #255CC1 (accent: 'blue')
- Accent Gold: #F1C819 (accent: 'gold')
- Accent Emerald: #3CBD2C (accent: 'emerald')

RESPONSE FORMAT:
You MUST respond with valid JSON ONLY matching this exact schema:
{
  "config": {
    "page_type": "calculator",
    "name": "Short descriptive page name",
    "slug_suggestion": "kebab-case-slug",
    "keyword_suggestion": "UPPERCASE_KEYWORD",
    "badge_text": "e.g. Official 2026 Assessment",
    "headline": "Punchy conversion-focused headline",
    "subtitle": "Clear benefit and instructions in 1-2 sentences",
    "cta_text": "Action-oriented button text",
    "theme_accent": "blue",
    "qualification_threshold": 6,
    "max_points": 10,
    "questions": [
      {
        "id": "q1",
        "question_number": 1,
        "question": "Clear question text?",
        "category": "Category",
        "options": [
          { "label": "Option A description", "points": 4 },
          { "label": "Option B description", "points": 2 },
          { "label": "Option C description", "points": 0 }
        ]
      }
    ],
    "result_pass": {
      "headline": "High Eligibility Qualified",
      "description": "Your profile meets the target benchmark.",
      "badge": "Qualified",
      "cta_text": "Claim Official Roadmap & Schedule Review"
    },
    "result_review": {
      "headline": "Pathway Review Recommended",
      "description": "Your score indicates alternative pathways or enhancement is needed.",
      "badge": "Pathway Review",
      "cta_text": "Request Profile Strategy Session"
    },
    "whatsapp_enabled": true,
    "whatsapp_message": "Hi TerraTern, I just completed the assessment."
  },
  "message": "Friendly 1-2 sentence response of what was designed or modified.",
  "suggestions": ["Follow-up suggestion 1", "Follow-up suggestion 2", "Follow-up suggestion 3"]
}`;

export async function vibeCodePage(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<VibeResponse> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. PRIMARY ENGINE: Google Gemini 3.5 Flash Lite
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      let userPrompt = prompt;
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        userPrompt = `Current Page Configuration:\n${JSON.stringify(currentConfig, null, 2)}\n\nUser Revision Request:\n${prompt}\n\nUpdate the configuration while preserving existing fields unless the user specifically asked to alter them. Return valid JSON only matching the schema.`;
      }

      // Add recent chat history if available
      let conversationContext = '';
      if (chatHistory && chatHistory.length > 0) {
        conversationContext = chatHistory
          .slice(-4)
          .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n');
      }

      const fullPrompt = `${SYSTEM_PROMPT}\n\n${conversationContext ? `Conversation History:\n${conversationContext}\n\n` : ''}User Prompt:\n${userPrompt}`;

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

      if (parsed.config && parsed.config.name && parsed.config.headline) {
        return {
          config: parsed.config,
          message: parsed.message || `Designed ${parsed.config.name} according to your prompt.`,
          suggestions: parsed.suggestions || [
            'Add a question for language score',
            'Change theme accent to emerald',
            'Require higher threshold points',
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

      let userMessage = prompt;
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        userMessage = `Current Page Configuration:\n${JSON.stringify(currentConfig, null, 2)}\n\nUser Revision Request:\n${prompt}\n\nUpdate the configuration while preserving existing fields unless the user specifically asked to alter them. Return valid JSON only.`;
      }

      messages.push({ role: 'user', content: userMessage });

      const completion = await groq.chat.completions.create({
        model: 'qwen/qwen3.8-27b',
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 3000,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      if (parsed.config && parsed.config.name && parsed.config.headline) {
        return {
          config: parsed.config,
          message: parsed.message || 'Page created successfully according to your specifications.',
          suggestions: parsed.suggestions || [
            'Add an IELTS band question',
            'Make the theme accent gold',
            'Add a free PDF guide download',
          ],
        };
      }
    } catch (err: any) {
      console.warn('Groq Vibe Engine failed, attempting Dynamic Heuristic Generator:', err?.message || err);
    }
  }

  // 3. TERTIARY ENGINE: Dynamic Universal Heuristic Generator
  return generateHeuristicPage(prompt, currentConfig);
}

// Built-in Dynamic Universal Heuristic Generator for zero-latency generation of ANY prompt
export function generateHeuristicPage(
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
  // Clean up title words
  const cleanTitle = prompt
    .replace(/(create|make|build|design|generate|a|an|the|page|quiz|for|landing|calculator)\s+/gi, '')
    .trim();
  const formattedTitle = cleanTitle ? cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1) : 'Global Immigration Assessment';

  return {
    config: {
      page_type: 'calculator',
      name: `${formattedTitle} Eligibility Assessment`,
      slug_suggestion: formattedTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32),
      keyword_suggestion: formattedTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 10),
      badge_text: 'Verified 2026 Immigration Criteria',
      headline: `Check Your Eligibility: ${formattedTitle}`,
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
      whatsapp_message: `Hi TerraTern, I completed the ${formattedTitle} assessment and would like my roadmap.`,
    },
    message: `Generated a tailored 2026 eligibility assessment for "${formattedTitle}" with custom scoring and qualification criteria.`,
    suggestions: [
      'Add a language test band requirement',
      'Change theme to Royal Navy or Gold',
      'Add a downloadable PDF checklist step',
    ],
  };
}
