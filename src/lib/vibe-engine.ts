import Groq from 'groq-sdk';

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
  // Calculator & Quiz options
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
  // Lead Magnet details
  lead_magnet?: {
    title: string;
    page_count: number;
    highlights: string[];
    format: string;
  };
  // WhatsApp Integration
  whatsapp_enabled?: boolean;
  whatsapp_message?: string;
}

export interface VibeResponse {
  config: VibePageConfig;
  message: string;
  suggestions: string[];
}

const SYSTEM_PROMPT = `You are TerraTern's AI Landing Page Architect and Vibe-Coder.
TerraTern is a premier global mobility and immigration consultancy (Canada Express Entry & PNP, Germany Opportunity Card, Australia PR, UK Skilled Worker, Schengen, Dubai Golden Visa).
Your job is to generate and iteratively refine high-converting, mobile-first lead capture pages based on social media CTAs (Instagram Reels, Carousels, Stories, LinkedIn).

BRAND IDENTITY & STYLING TOKENS:
- Brand Deep Navy: #00215C
- Brand Royal Blue: #255CC1
- Brand Sky Blue: #8DB5FF
- Accent Gold: #F1C819 (accent: 'gold')
- Accent Emerald: #3CBD2C (accent: 'emerald')

ACCURACY GUIDELINES:
- Canada Express Entry & CRS: Language (IELTS/CELPIP/CLB), Education (ECA recognized), Age, Skilled Work Experience (NOC TEER).
- Germany Opportunity Card (Chancenkarte): Point system under § 20a Skilled Immigration Act. Minimum 6 points needed to qualify. Points for Recognized Degree (4 pts), 5+ yrs experience (3 pts), German A2/B1 or English C1 (1-2 pts), Age under 35 (2 pts), Previous Germany stay (1 pt).
- Australia PR: Skilled Independent Subclass 189/190 points test (minimum 65 points).
- NEVER use generic robotic AI fluff like "Empowering your futuristic dreams" or "AI-powered seamless synergy". Use crisp, authoritative immigration terms like "Eligibility Assessment", "CRS Score Calculation", "2026 Checklist", "Verified PR Pathway".

RESPONSE FORMAT:
You MUST respond with valid JSON ONLY matching this schema:
{
  "config": {
    "page_type": "quiz" | "lead_magnet" | "calculator" | "consultation",
    "name": "Short descriptive page name",
    "slug_suggestion": "kebab-case-slug",
    "keyword_suggestion": "UPPERCASE_KEYWORD",
    "badge_text": "e.g. Official 2026 Immigration Assessment",
    "headline": "Punchy conversion-focused headline",
    "subtitle": "Clear benefit and instructions in 1-2 sentences",
    "cta_text": "Action-oriented button text",
    "theme_accent": "blue" | "gold" | "navy" | "emerald",
    "qualification_threshold": 6,
    "max_points": 10,
    "questions": [
      {
        "id": "q1",
        "question_number": 1,
        "question": "What is your highest completed education level?",
        "category": "Education",
        "options": [
          { "label": "Recognized Master's or Bachelor's Degree", "points": 4 },
          { "label": "2+ Year Vocational Training / Diploma", "points": 3 },
          { "label": "High School / Secondary", "points": 1 }
        ]
      }
    ],
    "result_pass": {
      "headline": "High Eligibility Qualified",
      "description": "Your profile meets the target threshold for direct application.",
      "badge": "Qualified",
      "cta_text": "Download Official Checklist & Claim Consultation"
    },
    "result_review": {
      "headline": "Further Assessment Recommended",
      "description": "Your profile may require language score improvement or provincial nomination.",
      "badge": "Pathway Review",
      "cta_text": "Request Free Profile Strategy Session"
    },
    "lead_magnet": {
      "title": "2026 Complete PR Checklist & Salary Roadmap",
      "page_count": 18,
      "highlights": [
        "Updated 2026 In-Demand NOC Job Codes",
        "Step-by-step document checklist and ECA guidelines",
        "Minimum points and cutoff breakdown"
      ],
      "format": "Verified PDF Guide"
    },
    "whatsapp_enabled": true,
    "whatsapp_message": "Hi TerraTern, I just completed the eligibility assessment and would like my roadmap."
  },
  "message": "Friendly 1-2 sentence response of what was designed or modified.",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}`;

export async function vibeCodePage(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<VibeResponse> {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey, timeout: 15000 });

      const messages: any[] = [
        { role: 'system', content: SYSTEM_PROMPT },
      ];

      // Add conversation context if refining
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
        max_tokens: 2500,
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(raw);

      if (parsed.config && parsed.config.headline) {
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
      console.warn('Groq Vibe Engine failed, trying fallback heuristic:', err.message);
    }
  }

  // Fallback: Smart Heuristic Generator
  return generateHeuristicPage(prompt, currentConfig);
}

// Built-in Smart Heuristic Generator for zero-latency offline generation
export function generateHeuristicPage(
  prompt: string,
  currentConfig?: Partial<VibePageConfig>
): VibeResponse {
  const p = prompt.toLowerCase();

  // Germany Opportunity Card
  if (p.includes('germany') || p.includes('chancenkarte') || p.includes('opportunity')) {
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
          headline: 'Congratulations — You Meet the 6-Point Threshold!',
          description: 'Your profile scores 6 or more points, qualifying you for the German Opportunity Card (Job Search Visa).',
          badge: 'Opportunity Card Eligible',
          cta_text: 'Download Official Germany Guide & Book Visa Strategy Call',
        },
        result_review: {
          headline: 'Score Under 6 Points — Strategic Pathway Needed',
          description: 'You are close to the required threshold. Enhancing your language certification or job search documentation can qualify you.',
          badge: 'Pathway Optimization Recommended',
          cta_text: 'Get Free Profile Upgrade Assessment',
        },
        lead_magnet: {
          title: '2026 Germany Opportunity Card Complete Handbook',
          page_count: 14,
          highlights: [
            'Official 6-point evaluation matrix and documentation',
            'English & German language exam requirements (Goethe, IELTS)',
            'Proof of funds and blocked account exemptions',
          ],
          format: 'Verified PDF Guide',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I scored on the Germany Opportunity Card calculator and would like to speak to an advisor.',
      },
      message: 'Generated a comprehensive 4-step Germany Opportunity Card eligibility calculator based on § 20a Skilled Immigration Act.',
      suggestions: [
        'Add a question for previous stay in Germany',
        'Make the theme accent gold',
        'Add an instant WhatsApp follow-up button',
      ],
    };
  }

  // Canada PR / Express Entry / CRS
  if (p.includes('canada') || p.includes('crs') || p.includes('express entry') || p.includes('pnp')) {
    return {
      config: {
        page_type: 'calculator',
        name: 'Canada Express Entry CRS Points Estimator',
        slug_suggestion: 'canada-pr-crs-estimator-2026',
        keyword_suggestion: 'CANADA',
        badge_text: '2026 Express Entry Benchmark',
        headline: 'Estimate Your Canada PR Comprehensive Ranking System (CRS) Score',
        subtitle: 'Find out if your age, education, and language benchmarks meet current Federal Skilled Worker and PNP cutoffs.',
        cta_text: 'Check My CRS Score & In-Demand NOCs',
        theme_accent: 'gold',
        qualification_threshold: 450,
        max_points: 600,
        questions: [
          {
            id: 'q1',
            question_number: 1,
            question: 'What is your current age bracket?',
            category: 'Age',
            options: [
              { label: '20 to 29 years old (Maximum CRS points)', points: 110 },
              { label: '30 to 34 years old', points: 95 },
              { label: '35 to 39 years old', points: 70 },
              { label: '40 years or older', points: 45 },
            ],
          },
          {
            id: 'q2',
            question_number: 2,
            question: 'What is your highest ECA-evaluated level of education?',
            category: 'Education',
            options: [
              { label: "Master's Degree or Professional Degree", points: 135 },
              { label: 'Two or more post-secondary degrees/diplomas', points: 128 },
              { label: "Bachelor's Degree (3+ year program)", points: 120 },
              { label: 'Post-secondary diploma (1-2 years)', points: 98 },
            ],
          },
          {
            id: 'q3',
            question_number: 3,
            question: 'What is your expected or certified IELTS / CELPIP English score?',
            category: 'Language',
            options: [
              { label: 'CLB 9 or higher (IELTS: L8.0, R7.0, W7.0, S7.0)', points: 136 },
              { label: 'CLB 8 (IELTS: L7.5, R6.5, W6.5, S6.5)', points: 100 },
              { label: 'CLB 7 (IELTS: 6.0 in all bands)', points: 68 },
              { label: 'Below CLB 7 / Not taken yet', points: 30 },
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
          description: 'Your score indicates that targeting a Provincial Nominee Program (PNP adds +600 points) or French language bonus will be your fastest route.',
          badge: 'PNP Opportunity Identified',
          cta_text: 'Explore Provincial Pathways with RCIC Advisor',
        },
        lead_magnet: {
          title: '2026 Canada PR Express Entry & PNP In-Demand Guide',
          page_count: 22,
          highlights: [
            'Targeted Category-Based STEM & Healthcare cutoffs',
            'Provincial nomination guide (OINP, BC PNP, Alberta)',
            'ECA credential assessment & IELTS score boosters',
          ],
          format: 'Verified PDF Guide',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, I calculated my Canada CRS score and want to review my PNP options.',
      },
      message: 'Created a high-converting Canada Express Entry CRS score calculator with CLB benchmarks and PNP pathway insights.',
      suggestions: [
        'Add a question for Canadian education/work experience',
        'Add a spouse qualification factor',
        'Change theme to brand royal blue',
      ],
    };
  }

  // Document Lead Magnet (General)
  if (p.includes('pdf') || p.includes('guide') || p.includes('checklist') || p.includes('download') || p.includes('document')) {
    return {
      config: {
        page_type: 'lead_magnet',
        name: 'Official 2026 Global PR & Work Visa Roadmap',
        slug_suggestion: 'official-pr-roadmap-2026',
        keyword_suggestion: 'GUIDE',
        badge_text: 'Immediate Access • 2026 Edition',
        headline: 'Download the Official 2026 Global Permanent Residency & Work Visa Roadmap',
        subtitle: 'The comprehensive, step-by-step documentation guide and salary benchmark for Canada, Germany, Australia, and the UK.',
        cta_text: 'Download Guide Now (Instant WhatsApp Delivery)',
        theme_accent: 'emerald',
        lead_magnet: {
          title: '2026 Global Talent Mobility & Immigration Playbook',
          page_count: 28,
          highlights: [
            'Direct comparison of Canada Express Entry vs Germany Opportunity Card vs Australia PR',
            'Full list of exempt degrees and recognized university equivalents',
            'Minimum proof-of-funds bank requirements and job seeker strategies',
            'Avoiding costly rejection traps: ECA, IELTS, and Police Clearances',
          ],
          format: 'PDF Handbook (18 MB)',
        },
        whatsapp_enabled: true,
        whatsapp_message: 'Hi TerraTern, please send me the official 2026 Global PR Roadmap PDF.',
      },
      message: 'Configured an instant-access Document Lead Magnet page with high-trust proof points and WhatsApp delivery.',
      suggestions: [
        'Add a bonus video masterclass access',
        'Make the theme accent navy',
        'Include country-specific salary tables',
      ],
    };
  }

  // Default: VIP 1-on-1 Profile Assessment
  return {
    config: {
      page_type: 'consultation',
      name: 'Personal Immigration Profile Assessment',
      slug_suggestion: 'profile-assessment-2026',
      keyword_suggestion: 'ASSESS',
      badge_text: 'Licensed Immigration Counselors',
      headline: 'Book Your Comprehensive 1-on-1 Immigration & Visa Strategy Session',
      subtitle: 'Have your academic credentials, work experience, and migration timeline evaluated by licensed global mobility specialists.',
      cta_text: 'Schedule Confidential Profile Review',
      theme_accent: 'navy',
      whatsapp_enabled: true,
      whatsapp_message: 'Hi TerraTern, I would like to book a 1-on-1 immigration consultation.',
    },
    message: 'Designed a VIP 1-on-1 Profile Consultation booking page with counselor credentials and fast callback routing.',
    suggestions: [
      'Convert to a 3-question eligibility test',
      'Add a free checklist download',
      'Set primary color to Royal Blue',
    ],
  };
}
