import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient, validateOriginAndCors } from '@/lib/api-security';
import {
  CalculatorItem,
  SEED_CALCULATORS,
  SEED_TESTIMONIALS,
  TestimonialItem,
} from '@/lib/public-directory';

export async function OPTIONS(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const { corsHeaders } = validateOriginAndCors(req);
  const cacheHeaders = {
    ...corsHeaders,
    'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
  };

  try {
    const supabase = getSupabaseServiceClient();

    // 1. Fetch live pages and testimonials in parallel for fast response
    const [pagesRes, testSettingRes] = await Promise.all([
      supabase
        .from('pages')
        .select('id, name, slug, page_key, page_type, status, page_url, config, created_at')
        .eq('status', 'live')
        .order('created_at', { ascending: false }),
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'public_testimonials')
        .maybeSingle(),
    ]);

    const dbPages = pagesRes.data;
    const dbErr = pagesRes.error;
    const testSetting = testSettingRes.data;

    let testimonials: TestimonialItem[] = SEED_TESTIMONIALS;
    if (testSetting?.value && Array.isArray(testSetting.value) && testSetting.value.length > 0) {
      testimonials = testSetting.value.filter((t: TestimonialItem) => t.status !== 'draft');
    }

    if (dbErr) {
      console.warn('Could not fetch pages from Supabase, serving seed catalog:', dbErr.message);
      const hero = SEED_CALCULATORS.find((c) => c.is_hero) || SEED_CALCULATORS[0];
      return NextResponse.json(
        {
          success: true,
          hero_calculator: hero,
          calculators: SEED_CALCULATORS,
          testimonials,
          total: SEED_CALCULATORS.length,
        },
        { headers: cacheHeaders }
      );
    }

    // Helper to detect country from text when admin hasn't set country_tag
    const detectCountry = (text: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes("canada") || lower.includes("crs") || lower.includes("express entry")) return "Canada";
      if (lower.includes("australia") || lower.includes("pr points") || lower.includes("subclass")) return "Australia";
      if (lower.includes("uk") || lower.includes("britain") || lower.includes("united kingdom")) return "UK";
      if (lower.includes("ireland") || lower.includes("irish")) return "Ireland";
      if (lower.includes("dubai") || lower.includes("uae") || lower.includes("emirates")) return "UAE";
      if (lower.includes("usa") || lower.includes("united states") || lower.includes("america") || lower.includes("h-1b") || lower.includes("eb-")) return "USA";
      if (lower.includes("sweden")) return "Sweden";
      if (lower.includes("austria")) return "Austria";
      if (lower.includes("schengen") || lower.includes("europe") || lower.includes("blue card")) return "EU";
      if (lower.includes("germany") || lower.includes("german") || lower.includes("chancenkarte")) return "Germany";
      return "Global";
    };

    // Helper to detect icon from text when admin hasn't set icon_type
    const detectIcon = (text: string, pageType: string): string => {
      const lower = text.toLowerCase();
      if (lower.includes("calc") || lower.includes("points") || lower.includes("score")) return "calculator";
      if (lower.includes("nurse") || lower.includes("health") || lower.includes("medical")) return "heart";
      if (lower.includes("card") || lower.includes("golden") || lower.includes("permit")) return "card";
      if (lower.includes("pdf") || lower.includes("guide") || lower.includes("checklist") || pageType === "lead_pdf") return "file";
      if (lower.includes("career") || lower.includes("job") || lower.includes("work") || lower.includes("employment")) return "briefcase";
      if (lower.includes("study") || lower.includes("student") || lower.includes("university")) return "graduation";
      if (lower.includes("shield") || lower.includes("security") || lower.includes("law")) return "shield";
      if (lower.includes("travel") || lower.includes("flight") || lower.includes("air")) return "plane";
      return "compass";
    };

    // 1. Filter DB pages to strictly ONLY those made live AND enabled for public view in webpage
    const livePublicDbPages = (dbPages || []).filter((p) => {
      if (p.status !== 'live') return false;
      if (p.slug === '' || p.slug === 'public-hub' || p.page_key === 'public_hub') return false;
      if (p.config && p.config.show_in_directory === false) return false;
      return true;
    });

    const SLUG_ALIASES: Record<string, string> = {
      "germany-eligibility-checker": "germany-opportunity-card",
      "nursing-eligibility-checker-for-germany": "nurses-in-germany",
      "eu-blue-card": "eu-blue-card-check",
      "austria-job-seeker-visa": "austria-red-white-red",
      "ireland-eligibility-checker": "ireland-eligibility-check",
    };

    // 2. Build index of SEED_CALCULATORS for visual enrichment (custom gradients, tags, flags, icons)
    const seedTemplateMap = new Map<string, CalculatorItem>();
    SEED_CALCULATORS.forEach((c) => seedTemplateMap.set(c.slug, c));

    // 3. Construct active calculators strictly from live, public-view-enabled pages
    let activeCalculators: CalculatorItem[] = [];

    if (livePublicDbPages.length > 0) {
      activeCalculators = livePublicDbPages.map((p) => {
        const cfg = p.config || {};
        const targetSeed = seedTemplateMap.get(p.slug) ||
          (SLUG_ALIASES[p.slug] ? seedTemplateMap.get(SLUG_ALIASES[p.slug]) : undefined);

        const detectedCountry = detectCountry(`${p.name} ${p.slug} ${cfg.subtitle || ""} ${cfg.keyword || ""}`);
        const detectedIcon = detectIcon(`${p.name} ${p.slug} ${cfg.subtitle || ""}`, p.page_type);

        const country = cfg.country_tag
          ? [cfg.country_tag]
          : Array.isArray(cfg.countries) && cfg.countries.length > 0
          ? cfg.countries
          : targetSeed?.countries || [detectedCountry];

        const icon = cfg.icon_type || cfg.icon || targetSeed?.icon || detectedIcon;
        const visa = cfg.visa_type
          ? [cfg.visa_type]
          : Array.isArray(cfg.visas) && cfg.visas.length > 0
          ? cfg.visas
          : targetSeed?.visas || [p.page_type === 'lead_pdf' ? 'Study' : 'Skilled Worker'];

        const type = p.page_type === 'lead_pdf'
          ? 'PDFs'
          : cfg.category
          ? (cfg.category === 'calculators' ? 'Calculators' : cfg.category === 'visas' ? 'Visas' : cfg.category === 'guides' ? 'Guides' : cfg.category === 'careers' ? 'Careers' : cfg.category === 'consultation' ? 'Consultation' : cfg.category)
          : targetSeed?.type || 'Calculators';

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          desc: cfg.subtitle || cfg.headline || targetSeed?.desc || 'Find out your eligibility under official immigration and visa criteria.',
          icon,
          countries: country,
          visas: visa,
          type,
          capsule_tag: cfg.capsule_tag || targetSeed?.capsule_tag || (p.page_type === 'lead_pdf' ? 'PDF Guide' : p.page_type === 'quiz' ? 'Quiz' : 'Calculator'),
          thumbnail_url: cfg.thumbnail_url || targetSeed?.thumbnail_url || undefined,
          views_count: typeof cfg.views_count === 'number' ? cfg.views_count : targetSeed?.views_count,
          profs: Array.isArray(cfg.profs) ? cfg.profs : (targetSeed?.profs || ['Any profession']),
          goals: Array.isArray(cfg.goals) ? cfg.goals : (targetSeed?.goals || ['Work', 'Study']),
          rank: cfg.rank || (cfg.is_hero_trending ? 100 : targetSeed?.rank || 10),
          hot: Boolean(cfg.hot || cfg.is_hero_trending || targetSeed?.hot),
          is_hero: Boolean(cfg.is_hero_trending || targetSeed?.is_hero),
          hero_badge: cfg.hero_badge || targetSeed?.hero_badge || "🔥 HIGH DEMAND",
          hero_cta_label: cfg.hero_cta_label || targetSeed?.hero_cta_label || "Start Free Check",
          url: p.page_url || `/p/${p.slug}`,
          page_key: p.page_key || (p as any).page_key || cfg.page_key || p.slug,
        };
      });
    } else {
      activeCalculators = [];
    }

    // Determine Hero Calculator:
    // First priority: any item explicitly marked with is_hero = true
    // Second priority: item marked with hot = true
    // Fallback: first item
    let hero = activeCalculators.find((c) => c.is_hero);
    if (!hero) {
      hero = activeCalculators.find((c) => c.hot) || (activeCalculators.length > 0 ? activeCalculators[0] : undefined);
    }

    return NextResponse.json(
      {
        success: true,
        hero_calculator: hero,
        calculators: activeCalculators,
        testimonials,
        total: activeCalculators.length,
      },
      { headers: cacheHeaders }
    );
  } catch (err: any) {
    console.error('Error serving public directory:', err);
    const hero = SEED_CALCULATORS.find((c) => c.is_hero) || SEED_CALCULATORS[0];
    return NextResponse.json(
      {
        success: true,
        hero_calculator: hero,
        calculators: SEED_CALCULATORS,
        testimonials: SEED_TESTIMONIALS,
        total: SEED_CALCULATORS.length,
      },
      { headers: cacheHeaders }
    );
  }
}
