export interface CalculatorItem {
  id: string;
  name: string;
  desc: string;
  icon: string;
  countries: string[];
  visas: string[];
  type: string;
  capsule_tag?: string;
  thumbnail_url?: string;
  thumbnail_gradient?: string;
  views_count?: number;
  profs?: string[];
  goals?: string[];
  rank: number;
  hot?: boolean;
  is_hero?: boolean;
  hero_badge?: string;
  hero_cta_label?: string;
  url?: string;
  slug: string;
  page_key?: string;
}

export interface TestimonialItem {
  id: string;
  n: string; // Name
  c: string; // City / Location
  q: string; // Quote
  rating?: number; // 1-5
  status?: 'live' | 'draft';
}

export interface LeadSubmissionPayload {
  name: string;
  email: string;
  phone: string;
  phone_e164?: string;
  dial_code: string;
  country_interested?: string;
  visa_interested?: string;
  calculator_name?: string;
  calculator_slug?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  consent: boolean;
}

export const FRONTEND_HUB_PAGE = {
  id: "page_frontend_hub",
  name: "Web Page",
  slug: "",
  page_type: "welcome" as const,
  status: "live" as const,
  start_at: null,
  end_at: null,
  keyword: "calculators immigration mobility webpage",
  page_url: "/",
  closed_message: null,
  closed_redirect_url: null,
  pdf_asset_id: null,
  page_key: "public_hub",
  allowed_origins: ["*"],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: new Date().toISOString(),
  config: {
    country_tag: "Global",
    icon_type: "compass",
    capsule_tag: "",
    show_in_directory: false,
    is_hero_trending: false,
    hero_badge: "🔥 HIGH DEMAND",
    hero_cta_label: "Start Free Check",
    views_count: 2450,
    is_frontend_hub: true,
  },
  views_count: 2450,
  leads_count: 0,
  conversion_percentage: 0,
};

export const SEED_CALCULATORS: CalculatorItem[] = [
  {
    id: "calc-ireland",
    name: "Ireland Eligibility Check",
    slug: "ireland-eligibility-check",
    icon: "compass",
    countries: ["Ireland"],
    visas: ["Work Permit", "Study"],
    type: "Calculators",
    capsule_tag: "Calculator",
    profs: ["Any profession"],
    goals: ["Work", "Study"],
    rank: 13,
    hot: true,
    is_hero: true,
    desc: "See which routes to Ireland may fit you: work, study or family.",
    url: "/p/ireland-eligibility-check",
  },
  {
    id: "calc-germany",
    name: "Germany Eligibility Check",
    slug: "germany-opportunity-card",
    icon: "check",
    countries: ["Germany"],
    visas: ["Skilled Worker", "Opportunity Card"],
    type: "Calculators",
    capsule_tag: "Visa Check",
    profs: ["Any profession"],
    goals: ["Work", "Study"],
    rank: 12,
    hot: true,
    desc: "See which routes to Germany may fit your work, study or skills under the Chancenkarte rules.",
    url: "/p/germany-opportunity-card",
  },
  {
    id: "calc-nurses-germany",
    name: "Nurses in Germany Check",
    slug: "nurses-in-germany",
    icon: "heart",
    countries: ["Germany"],
    visas: ["Healthcare", "Skilled Worker"],
    type: "Calculators",
    capsule_tag: "Job Kit",
    profs: ["Nurse"],
    goals: ["Work"],
    rank: 11,
    hot: false,
    desc: "Find out how ready your nursing profile is for licensed working in Germany.",
    url: "/p/nurses-in-germany",
  },
  {
    id: "calc-eu-blue-card",
    name: "EU Blue Card Check",
    slug: "eu-blue-card-check",
    icon: "card",
    countries: ["EU", "Germany"],
    visas: ["EU Blue Card"],
    type: "Calculators",
    capsule_tag: "PR Points",
    profs: ["Degree holder"],
    goals: ["Work", "Settle"],
    rank: 10,
    hot: false,
    desc: "Check if the EU Blue Card may be a fast-track settlement route for your salary and degree.",
    url: "/p/eu-blue-card-check",
  },
  {
    id: "calc-canada-crs",
    name: "Canada Express Entry CRS Calculator",
    slug: "canada-crs-calculator",
    icon: "calculator",
    countries: ["Canada"],
    visas: ["Express Entry", "Skilled Worker"],
    type: "Calculators",
    capsule_tag: "CRS Score",
    profs: ["Any profession", "Degree holder"],
    goals: ["Work", "Settle"],
    rank: 9,
    hot: false,
    desc: "Evaluate your Comprehensive Ranking System score for Federal Skilled Worker and Provincial Nominee pathways.",
    url: "/p/canada-crs-calculator",
  },
  {
    id: "calc-australia-pr",
    name: "Australia PR Points Assessment",
    slug: "australia-pr-points",
    icon: "compass",
    countries: ["Australia"],
    visas: ["Skilled Worker", "Work Permit"],
    type: "Calculators",
    capsule_tag: "Points Check",
    profs: ["Any profession", "Degree holder"],
    goals: ["Work", "Settle"],
    rank: 8,
    hot: false,
    desc: "Check your 65-point benchmark for Subclass 189 (Independent) & Subclass 190 (State Nominated).",
    url: "/p/australia-pr-points",
  },
  {
    id: "calc-austria-rwr",
    name: "Austria Red-White-Red Card Assessment",
    slug: "austria-red-white-red",
    icon: "check",
    countries: ["Austria"],
    visas: ["Work Permit", "Skilled Worker"],
    type: "Calculators",
    capsule_tag: "Points Check",
    profs: ["Any profession", "Degree holder"],
    goals: ["Work", "Settle"],
    rank: 7,
    hot: false,
    desc: "Verify your points benchmark for Austria's Red-White-Red Card for Very Highly Qualified Workers.",
    url: "/p/austria-red-white-red",
  },
  {
    id: "calc-sweden-permit",
    name: "Sweden Work Permit & Job Seeker Check",
    slug: "sweden-work-permit",
    icon: "briefcase",
    countries: ["Sweden"],
    visas: ["Work Permit", "Skilled Worker"],
    type: "Calculators",
    capsule_tag: "Visa Check",
    profs: ["Any profession", "Degree holder"],
    goals: ["Work"],
    rank: 6,
    hot: false,
    desc: "Assess Swedish work permit requirements and job seeker visa pathways for skilled professionals.",
    url: "/p/sweden-work-permit",
  },
  {
    id: "calc-us-h1b",
    name: "USA H-1B & EB-2 Pathway Assessment",
    slug: "usa-work-visa",
    countries: ["USA", "US"],
    visas: ["Skilled Worker", "Work Permit"],
    type: "Calculators",
    capsule_tag: "Visa Check",
    icon: "card",
    profs: ["Degree holder", "Any profession"],
    goals: ["Work", "Settle"],
    rank: 5,
    hot: false,
    desc: "Evaluate H-1B specialty occupation criteria, cap-exempt sponsorship, and EB-2 NIW qualifications.",
    url: "/p/usa-work-visa",
  },
  {
    id: "calc-dubai-golden",
    name: "Dubai 10-Year Golden Visa Check",
    slug: "dubai-golden-visa-2026",
    icon: "card",
    countries: ["UAE"],
    visas: ["Golden Visa", "Skilled Worker"],
    type: "Calculators",
    capsule_tag: "Investor Visa",
    profs: ["Degree holder", "Executive"],
    goals: ["Work", "Settle"],
    rank: 4,
    hot: false,
    desc: "Pre-screen your eligibility for the UAE 10-Year Golden Visa with 0% personal income tax.",
    url: "/p/dubai-golden-visa-2026",
  },
  {
    id: "calc-uk-shortage",
    name: "UK Skilled Worker Visa Check",
    slug: "uk-skilled-worker",
    icon: "check",
    countries: ["UK"],
    visas: ["Skilled Worker"],
    type: "Calculators",
    capsule_tag: "Visa Check",
    profs: ["Any profession", "Degree holder"],
    goals: ["Work"],
    rank: 3,
    hot: false,
    desc: "Verify salary thresholds, Certificate of Sponsorship (CoS), and occupation eligibility.",
    url: "/p/uk-skilled-worker",
  },
  {
    id: "calc-schengen-kit",
    name: "Schengen Visa Document Checklist",
    slug: "schengen-checklist-guide",
    icon: "file",
    countries: ["EU"],
    visas: ["Travel & Visit", "Study"],
    type: "PDFs",
    capsule_tag: "PDF Guide",
    profs: ["Any profession"],
    goals: ["Study", "Work"],
    rank: 2,
    hot: false,
    desc: "Instant download of the verified 2026 Schengen visa filing kit covering all 29 European states.",
    url: "/p/schengen-checklist-guide",
  },
  {
    id: "calc-work-app",
    name: "TerraTern Global Hiring Portal",
    slug: "work-application",
    icon: "briefcase",
    countries: ["Germany", "Australia", "Canada"],
    visas: ["Skilled Worker", "Healthcare"],
    type: "Calculators",
    capsule_tag: "Job Portal",
    profs: ["Any profession", "Nurse", "Degree holder"],
    goals: ["Work"],
    rank: 1,
    hot: true,
    desc: "Direct recruitment and job-matching portal for tech, healthcare, and engineering vacancies abroad.",
    url: "https://work-applications.vercel.app",
  },
];

export const SEED_TESTIMONIALS: TestimonialItem[] = [
  {
    id: "t1",
    n: "Priya Nair",
    c: "Kochi, Kerala",
    q: "I was confused about which route suits a nurse. The checker gave me a clear answer in two minutes, and the call after it was patient and honest.",
    rating: 5,
    status: "live",
  },
  {
    id: "t2",
    n: "Rahul Verma",
    c: "Lucknow, Uttar Pradesh",
    q: "No jargon at all. I answered a few questions on my phone and knew what to improve before I even spoke to anyone.",
    rating: 5,
    status: "live",
  },
  {
    id: "t3",
    n: "Anjali Reddy",
    c: "Hyderabad, Telangana",
    q: "My counsellor explained each step of the Blue Card process slowly and replied on WhatsApp even on a Sunday. That meant a lot.",
    rating: 5,
    status: "live",
  },
  {
    id: "t4",
    n: "Mohammed Faisal",
    c: "Bengaluru, Karnataka",
    q: "I had tried a few agents before. TerraTern was the first team that told me what I was missing instead of just selling me a package.",
    rating: 5,
    status: "live",
  },
  {
    id: "t5",
    n: "Sneha Patil",
    c: "Pune, Maharashtra",
    q: "The result was gentle and clear. It showed what to work on next, so I did not feel rejected, I felt guided.",
    rating: 5,
    status: "live",
  },
  {
    id: "t6",
    n: "Arjun Menon",
    c: "Thiruvananthapuram, Kerala",
    q: "Honest answers, no false promises. They told me my German level needed work first, and gave me a plan for it.",
    rating: 5,
    status: "live",
  },
  {
    id: "t7",
    n: "Divya Krishnan",
    c: "Chennai, Tamil Nadu",
    q: "I used the Ireland checker on my lunch break. Short questions, simple words, and I knew my options by the time I finished my tea.",
    rating: 5,
    status: "live",
  },
  {
    id: "t8",
    n: "Gurpreet Singh",
    c: "Ludhiana, Punjab",
    q: "My family had many doubts. The team spoke to all of us in Punjabi and Hindi and answered every question without hurrying.",
    rating: 5,
    status: "live",
  },
  {
    id: "t9",
    n: "Neha Sharma",
    c: "Jaipur, Rajasthan",
    q: "I liked that it was free and quick. The consultation felt like talking to a friend who actually knows the process.",
    rating: 5,
    status: "live",
  },
  {
    id: "t10",
    n: "Karthik Iyer",
    c: "Coimbatore, Tamil Nadu",
    q: "Clear documents list, clear timelines. For the first time I understood what happens after I apply.",
    rating: 5,
    status: "live",
  },
  {
    id: "t11",
    n: "Ritu Das",
    c: "Kolkata, West Bengal",
    q: "I was nervous about starting. The calculator made it feel easy, and the team called me the same day.",
    rating: 5,
    status: "live",
  },
  {
    id: "t12",
    n: "Sanjay Kulkarni",
    c: "Nagpur, Maharashtra",
    q: "They checked my profile properly and suggested a route I had not even thought about. Very practical advice.",
    rating: 5,
    status: "live",
  },
  {
    id: "t13",
    n: "Fatima Sheikh",
    c: "Mumbai, Maharashtra",
    q: "Everything was explained in simple English, and nothing was hidden. I always knew where I stood.",
    rating: 5,
    status: "live",
  },
  {
    id: "t14",
    n: "Vivek Joshi",
    c: "Indore, Madhya Pradesh",
    q: "The EU Blue Card check saved me hours of reading random websites. I got a straight answer and a next step.",
    rating: 5,
    status: "live",
  },
];

export const COUNTRIES_LIST = ["All countries", "Germany", "Austria", "Sweden", "EU", "UK", "USA", "Canada", "Australia", "Ireland", "UAE"];
export const VISAS_LIST = ["All visas", "EU Blue Card", "Healthcare", "Opportunity Card", "Skilled Worker", "Study", "Work Permit", "Express Entry", "Golden Visa"];
export const TYPES_LIST = ["All types", "Calculators", "PDFs", "Visas"];
export const PROFS_LIST = ["All professions", "Nurse", "Degree holder", "Any profession", "Executive"];
export const GOALS_LIST = ["All goals", "Work", "Study", "Settle"];
export const SORT_OPTIONS = ["Trending", "Newest", "A to Z"];

export const COUNTRY_DIAL_CODES = [
  { code: "+91", label: "India (+91)", flag: "🇮🇳" },
  { code: "+49", label: "Germany (+49)", flag: "🇩🇪" },
  { code: "+353", label: "Ireland (+353)", flag: "🇮🇪" },
  { code: "+1", label: "USA / Canada (+1)", flag: "🇺🇸" },
  { code: "+61", label: "Australia (+61)", flag: "🇦🇺" },
  { code: "+44", label: "UK (+44)", flag: "🇬🇧" },
  { code: "+971", label: "UAE (+971)", flag: "🇦🇪" },
  { code: "+65", label: "Singapore (+65)", flag: "🇸🇬" },
  { code: "+33", label: "France (+33)", flag: "🇫🇷" },
  { code: "+39", label: "Italy (+39)", flag: "🇮🇹" },
];
