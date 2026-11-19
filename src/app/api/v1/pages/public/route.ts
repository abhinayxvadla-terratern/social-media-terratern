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
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  };

  try {
    const supabase = getSupabaseServiceClient();

    // 1. Fetch live pages and testimonials in parallel for fast response
    const [pagesRes, testSettingRes] = await Promise.all([
      supabase
        .from('pages')
        .select('id, name, slug, page_type, status, page_url, config, created_at')
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

    // Transform DB rows into CalculatorItem
    const liveDbCalculators: CalculatorItem[] = (dbPages || [])
      .filter((p) => {
        if (p.config && p.config.show_in_directory === false) return false;
        return true;
      })
      .map((p) => {
        const cfg = p.config || {};
        const detectedCountry = detectCountry(`${p.name} ${p.slug} ${cfg.subtitle || ""} ${cfg.keyword || ""}`);
        const detectedIcon = detectIcon(`${p.name} ${p.slug} ${cfg.subtitle || ""}`, p.page_type);

        const country = cfg.country_tag ? [cfg.country_tag] : (Array.isArray(cfg.countries) && cfg.countries.length > 0 ? cfg.countries : [detectedCountry]);
        const icon = cfg.icon_type || cfg.icon || detectedIcon;
        const visa = cfg.visa_type ? [cfg.visa_type] : (Array.isArray(cfg.visas) && cfg.visas.length > 0 ? cfg.visas : [p.page_type === 'lead_pdf' ? 'Study' : 'Skilled Worker']);
        const type = p.page_type === 'lead_pdf' ? 'PDFs' : (cfg.category ? (cfg.category === 'calculators' ? 'Calculators' : cfg.category === 'visas' ? 'Visas' : cfg.category === 'guides' ? 'Guides' : cfg.category === 'careers' ? 'Careers' : 'Calculators') : 'Calculators');

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          desc: cfg.subtitle || cfg.headline || 'Find out your eligibility under official immigration and visa criteria.',
          icon,
          countries: Array.isArray(cfg.countries) && cfg.countries.length > 0 && cfg.country_tag === undefined ? cfg.countries : country,
          visas: Array.isArray(cfg.visas) ? cfg.visas : visa,
          type,
          capsule_tag: cfg.capsule_tag || (p.page_type === 'lead_pdf' ? 'PDF Guide' : p.page_type === 'quiz' ? 'Quiz' : 'Calculator'),
          thumbnail_url: cfg.thumbnail_url || undefined,
          views_count: typeof cfg.views_count === 'number' ? cfg.views_count : (typeof (p as any).views_count === 'number' ? (p as any).views_count : undefined),
          profs: Array.isArray(cfg.profs) ? cfg.profs : ['Any profession'],
          goals: Array.isArray(cfg.goals) ? cfg.goals : ['Work', 'Study'],
          rank: cfg.rank || (cfg.is_hero_trending ? 100 : 10),
          hot: Boolean(cfg.hot || cfg.is_hero_trending),
          is_hero: Boolean(cfg.is_hero_trending),
          hero_badge: cfg.hero_badge || "🔥 HIGH DEMAND",
          hero_cta_label: cfg.hero_cta_label || "Start Free Check",
          url: p.page_url || `/p/${p.slug}`,
          page_key: (p as any).page_key || cfg.page_key || p.slug,
        };
      });

    // Merge live DB pages with SEED_CALCULATORS so the 13 original calculators ALWAYS remain stable,
    // guaranteeing ZERO flash, ZERO color changes, and 100% reliable rendering on refresh.
    const seedMap = new Map<string, CalculatorItem>();
    SEED_CALCULATORS.forEach((c) => seedMap.set(c.slug, { ...c }));

    // Overlay any matching DB pages or append additional published calculators
    liveDbCalculators.forEach((dbCalc) => {
      if (dbCalc.slug && dbCalc.slug !== "" && dbCalc.slug !== "public-hub") {
        if (seedMap.has(dbCalc.slug)) {
          const existing = seedMap.get(dbCalc.slug)!;
          seedMap.set(dbCalc.slug, {
            ...existing,
            ...dbCalc,
            name: dbCalc.name || existing.name,
            desc: dbCalc.desc || existing.desc,
            is_hero: dbCalc.is_hero || existing.is_hero,
            rank: dbCalc.rank || existing.rank,
          });
        } else {
          seedMap.set(dbCalc.slug, dbCalc);
        }
      }
    });

    const activeCalculators: CalculatorItem[] = Array.from(seedMap.values());

    // Determine Hero Calculator:
    // First priority: any item explicitly marked with is_hero = true
    // Second priority: item marked with hot = true
    // Fallback: first item
    let hero = activeCalculators.find((c) => c.is_hero);
    if (!hero) {
      hero = activeCalculators.find((c) => c.hot) || activeCalculators[0];
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
