import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PageConfig {
  id: string;
  slug: string;
  title: string;
  seo_title: string;
  seo_description: string;
  enabled: boolean;
  show_in_nav: boolean;
  sections: SectionConfig[];
}

interface SectionConfig {
  id: string;
  type: string;
  label: string;
  enabled: boolean;
}

interface NavItem {
  label: string;
  url: string;
}

interface AutoFix {
  type: 'enable_section' | 'enable_page' | 'generate_seo' | 'navigate_only';
  sectionType?: string;
  pageId?: string;
  field?: string;
}

interface Finding {
  id: string;
  category: "seo" | "conversion" | "content" | "structure";
  severity: "pass" | "info" | "warn" | "error";
  message: string;
  points: number;
  maxPoints: number;
  actionTarget?: string;
  autoFix?: AutoFix;
}

interface CategoryScore {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  findings: Finding[];
}

// ─── Rule-Based Analysis (Pass 1) ─────────────────────────────────

function runRuleChecks(
  pages: PageConfig[],
  navItems: NavItem[],
  siteSettings: Record<string, unknown>
): Finding[] {
  const findings: Finding[] = [];
  const homePage = pages.find((p: any) => p.id === "home");
  const homeSections = homePage?.sections ?? [];
  const enabledHomeSections = homeSections.filter((s: any) => s.enabled);

  // ─── SEO ───
  for (const page of pages.filter((p: any) => p.enabled)) {
    if (!page.seo_title || page.seo_title.trim() === "") {
      findings.push({
        id: `seo_title_${page.id}`,
        category: "seo",
        severity: "warn",
        message: `"${page.title}" page is missing an SEO title`,
        points: 0,
        maxPoints: 3,
        actionTarget: `page-settings-${page.id}`,
        autoFix: { type: 'generate_seo', pageId: page.id, field: 'seo_title' },
      });
    } else {
      findings.push({
        id: `seo_title_${page.id}`,
        category: "seo",
        severity: "pass",
        message: `"${page.title}" has an SEO title`,
        points: 3,
        maxPoints: 3,
      });
    }

    if (!page.seo_description || page.seo_description.trim() === "") {
      findings.push({
        id: `seo_desc_${page.id}`,
        category: "seo",
        severity: "warn",
        message: `"${page.title}" page is missing a meta description`,
        points: 0,
        maxPoints: 3,
        actionTarget: `page-settings-${page.id}`,
        autoFix: { type: 'generate_seo', pageId: page.id, field: 'seo_description' },
      });
    } else {
      findings.push({
        id: `seo_desc_${page.id}`,
        category: "seo",
        severity: "pass",
        message: `"${page.title}" has a meta description`,
        points: 3,
        maxPoints: 3,
      });
    }
  }

  const heroSection = enabledHomeSections.find((s: any) => s.type === "hero");
  if (heroSection) {
    findings.push({
      id: "seo_hero_heading",
      category: "seo",
      severity: "pass",
      message: "Hero section is enabled with heading",
      points: 2,
      maxPoints: 2,
    });
  } else {
    findings.push({
      id: "seo_hero_heading",
      category: "seo",
      severity: "error",
      message: "Hero section is disabled — main heading missing for SEO",
      points: 0,
      maxPoints: 2,
      actionTarget: "hero",
      autoFix: { type: 'enable_section', sectionType: 'hero' },
    });
  }

  const faqSection = homeSections.find((s: any) => s.type === "faq");
  if (faqSection?.enabled) {
    findings.push({
      id: "seo_faq",
      category: "seo",
      severity: "pass",
      message: "FAQ section enabled — great for rich snippets",
      points: 2,
      maxPoints: 2,
    });
  } else {
    findings.push({
      id: "seo_faq",
      category: "seo",
      severity: "info",
      message: "Enable FAQ section for schema markup and local SEO boost",
      points: 0,
      maxPoints: 2,
      actionTarget: "faq",
      autoFix: { type: 'enable_section', sectionType: 'faq' },
    });
  }

  // ─── Conversion ───
  if (heroSection) {
    findings.push({
      id: "conv_hero_cta",
      category: "conversion",
      severity: "pass",
      message: "Hero section has CTA potential",
      points: 5,
      maxPoints: 5,
      actionTarget: "hero",
    });
  } else {
    findings.push({
      id: "conv_hero_cta",
      category: "conversion",
      severity: "error",
      message: "No hero section — visitors lack a clear call to action",
      points: 0,
      maxPoints: 5,
      actionTarget: "hero",
      autoFix: { type: 'enable_section', sectionType: 'hero' },
    });
  }

  const servicesSection = enabledHomeSections.find((s: any) => s.type === "services_preview" || s.type === "popular_services"
  );
  if (servicesSection) {
    findings.push({
      id: "conv_services_cta",
      category: "conversion",
      severity: "pass",
      message: "Services section enabled with booking access",
      points: 4,
      maxPoints: 4,
    });
  } else {
    findings.push({
      id: "conv_services_cta",
      category: "conversion",
      severity: "warn",
      message: "No services section — add booking CTAs for visitors",
      points: 0,
      maxPoints: 4,
      actionTarget: "services-preview",
      autoFix: { type: 'enable_section', sectionType: 'services_preview' },
    });
  }

  const testimonialsSection = enabledHomeSections.find((s: any) => s.type === "testimonials"
  );
  if (testimonialsSection) {
    findings.push({
      id: "conv_testimonials",
      category: "conversion",
      severity: "pass",
      message: "Testimonials section builds social proof",
      points: 3,
      maxPoints: 3,
    });
  } else {
    findings.push({
      id: "conv_testimonials",
      category: "conversion",
      severity: "info",
      message: "Enable testimonials — social proof increases conversions 15-20%",
      points: 0,
      maxPoints: 3,
      actionTarget: "testimonials-section",
      autoFix: { type: 'enable_section', sectionType: 'testimonials' },
    });
  }

  const newClientSection = enabledHomeSections.find((s: any) => s.type === "new_client"
  );
  if (newClientSection) {
    findings.push({
      id: "conv_new_client",
      category: "conversion",
      severity: "pass",
      message: "New client offer section active",
      points: 3,
      maxPoints: 3,
    });
  } else {
    findings.push({
      id: "conv_new_client",
      category: "conversion",
      severity: "info",
      message: "Add a new client offer to convert first-time visitors",
      points: 0,
      maxPoints: 3,
      actionTarget: "new-client",
      autoFix: { type: 'enable_section', sectionType: 'new_client' },
    });
  }

  // ─── Content ───
  for (const section of enabledHomeSections) {
    if (!section.label || section.label.trim() === "") {
      findings.push({
        id: `content_label_${section.id}`,
        category: "content",
        severity: "warn",
        message: `Section "${section.id}" has an empty label`,
        points: 0,
        maxPoints: 2,
      });
    }
  }
  if (!findings.some((f: any) => f.id.startsWith("content_label_"))) {
    findings.push({
      id: "content_labels_ok",
      category: "content",
      severity: "pass",
      message: "All section labels are filled in",
      points: 2,
      maxPoints: 2,
    });
  }

  const brandStatement =
    (siteSettings?.brand_statement as string) || "";
  if (brandStatement.length > 0 && brandStatement.length <= 200) {
    findings.push({
      id: "content_brand_length",
      category: "content",
      severity: "pass",
      message: "Brand statement length is ideal",
      points: 2,
      maxPoints: 2,
    });
  } else if (brandStatement.length > 200) {
    findings.push({
      id: "content_brand_length",
      category: "content",
      severity: "info",
      message: `Brand statement is ${brandStatement.length} chars — consider trimming to under 200`,
      points: 1,
      maxPoints: 2,
      actionTarget: "brand",
    });
  } else {
    findings.push({
      id: "content_brand_length",
      category: "content",
      severity: "info",
      message: "No brand statement configured",
      points: 0,
      maxPoints: 2,
      actionTarget: "brand",
    });
  }

  // ─── Structure ───
  if (enabledHomeSections.length >= 5) {
    findings.push({
      id: "struct_section_count",
      category: "structure",
      severity: "pass",
      message: `${enabledHomeSections.length} sections enabled on homepage`,
      points: 3,
      maxPoints: 3,
    });
  } else {
    findings.push({
      id: "struct_section_count",
      category: "structure",
      severity: "warn",
      message: `Only ${enabledHomeSections.length} sections enabled — aim for 5+ for a complete site`,
      points: 1,
      maxPoints: 3,
    });
  }

  const aboutPage = pages.find((p: any) =>
      (p.id === "about" || p.slug === "about") && p.enabled
  );
  if (aboutPage) {
    findings.push({
      id: "struct_about_page",
      category: "structure",
      severity: "pass",
      message: "About page is enabled",
      points: 3,
      maxPoints: 3,
    });
  } else {
    findings.push({
      id: "struct_about_page",
      category: "structure",
      severity: "warn",
      message: 'No "About" page — visitors want to know your story',
      points: 0,
      maxPoints: 3,
      autoFix: { type: 'enable_page', pageId: 'about' },
    });
  }

  const gallerySection = enabledHomeSections.find((s: any) => s.type === "gallery"
  );
  if (gallerySection) {
    findings.push({
      id: "struct_gallery",
      category: "structure",
      severity: "pass",
      message: "Gallery section showcases your work",
      points: 2,
      maxPoints: 2,
    });
  } else {
    findings.push({
      id: "struct_gallery",
      category: "structure",
      severity: "info",
      message: "Enable a gallery section — visual proof drives bookings",
      points: 0,
      maxPoints: 2,
      actionTarget: "gallery-section",
      autoFix: { type: 'enable_section', sectionType: 'gallery' },
    });
  }

  if (navItems.length >= 3) {
    findings.push({
      id: "struct_nav_links",
      category: "structure",
      severity: "pass",
      message: `Navigation has ${navItems.length} links`,
      points: 2,
      maxPoints: 2,
    });
  } else {
    findings.push({
      id: "struct_nav_links",
      category: "structure",
      severity: "warn",
      message: `Navigation has only ${navItems.length} link(s) — add more for discoverability`,
      points: 0,
      maxPoints: 2,
      actionTarget: "navigation",
    });
  }

  return findings;
}

function scoreFindingsByCategory(findings: Finding[]): CategoryScore[] {
  const categories: Record<string, { label: string; findings: Finding[] }> = {
    seo: { label: "SEO", findings: [] },
    conversion: { label: "Conversion", findings: [] },
    content: { label: "Content Quality", findings: [] },
    structure: { label: "Site Structure", findings: [] },
  };

  for (const f of findings) {
    categories[f.category]?.findings.push(f);
  }

  return Object.entries(categories).map(([key, { label, findings: catFindings }]) => ({
    category: key,
    label,
    score: catFindings.reduce((sum: any, f: any) => sum + f.points, 0),
    maxScore: catFindings.reduce((sum: any, f: any) => sum + f.maxPoints, 0),
    findings: catFindings,
  }));
}

// ─── AI Pass (Pass 2) ─────────────────────────────────────────────

async function runAIAnalysis(
  pages: PageConfig[],
  categories: CategoryScore[],
  totalScore: number,
  maxScore: number
): Promise<string[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set — skipping AI pass");
    return [
      "Enable the FAQ section to improve local search ranking",
      "Add a new client special offer to convert first-time visitors",
      "Include your phone number in the footer for immediate conversions",
    ];
  }

  const systemPrompt = `You are a salon website conversion specialist. You analyze website configurations and provide actionable enhancement suggestions specific to the salon and beauty industry.

Rules:
- Return ONLY a JSON array of 3-5 suggestion strings
- Each suggestion should be one concise sentence (max 25 words)
- Focus on high-impact, easy-to-implement changes
- Reference salon industry benchmarks when possible
- Include one "quick win" that takes under 2 minutes
- Do NOT repeat issues already found in the rule-based checks
- Be specific: mention section names, page types, or content strategies`;

  const userPrompt = `Analyze this salon website configuration. Current score: ${totalScore}/${maxScore}.

Pages: ${JSON.stringify(pages.map((p: any) => ({ id: p.id, title: p.title, enabled: p.enabled, sectionCount: p.sections.filter((s: any) => s.enabled).length, seo_title: p.seo_title, seo_description: p.seo_description })))}

Category scores: ${JSON.stringify(categories.map((c: any) => ({ category: c.label, score: c.score, max: c.maxScore })))}

Existing issues found: ${JSON.stringify(categories.flatMap((c: any) => c.findings.filter((f: any) => f.severity !== "pass").map((f: any) => f.message)))}

Provide 3-5 NEW enhancement suggestions as a JSON array of strings.`;

  try {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON array from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      if (Array.isArray(suggestions)) {
        return suggestions.filter((s: unknown) => typeof s === "string").slice(0, 5);
      }
    }

    return [];
  } catch (err) {
    console.error("AI analysis error:", err);
    return [];
  }
}

// ─── Main Handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pages, navItems, siteSettings } = await req.json();

    if (!pages || !Array.isArray(pages)) {
      return new Response(
        JSON.stringify({ error: "pages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Pass 1: Rule-based checks
    const findings = runRuleChecks(
      pages as PageConfig[],
      (navItems ?? []) as NavItem[],
      (siteSettings ?? {}) as Record<string, unknown>
    );
    const categories = scoreFindingsByCategory(findings);
    const totalScore = categories.reduce((sum: any, c: any) => sum + c.score, 0);
    const maxScore = categories.reduce((sum: any, c: any) => sum + c.maxScore, 0);
    const scorePercent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Pass 2: AI suggestions
    const aiSuggestions = await runAIAnalysis(
      pages as PageConfig[],
      categories,
      totalScore,
      maxScore
    );

    return new Response(
      JSON.stringify({
        score: scorePercent,
        totalPoints: totalScore,
        maxPoints: maxScore,
        categories,
        aiSuggestions,
        analyzedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
