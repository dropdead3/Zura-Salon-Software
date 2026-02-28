

## Website Intelligence Layer: AI-Powered Site Analysis

### Overview
Add a fourth tab ("Insights") to the Structure Panel and a dedicated analysis engine that evaluates the salon website across SEO, conversion, content quality, and structure — surfacing a scored report with actionable recommendations.

### Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  Structure Panel                                              │
│  [Pages] [Sections] [Nav] [Insights ✨]                      │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  Conversion Score: 72/100          [Re-analyze]          │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░░░░░░░           │ │
│  │                                                          │ │
│  │  ▼ SEO (18/25)                                          │ │
│  │    ⚠ Missing meta description on "About Us" page        │ │
│  │    ✓ All pages have titles                               │ │
│  │    ⚠ No alt text on 3 gallery images                    │ │
│  │                                                          │ │
│  │  ▼ Conversion (20/25)                                   │ │
│  │    ✗ No CTA in hero section                             │ │
│  │    ⚠ Booking button missing from services page          │ │
│  │    ✓ Contact info in footer                              │ │
│  │                                                          │ │
│  │  ▼ Content Quality (16/25)                              │ │
│  │    ⚠ 2 spelling issues detected                         │ │
│  │    ⚠ Brand statement is too long (>200 chars)           │ │
│  │                                                          │ │
│  │  ▼ Structure (18/25)                                    │ │
│  │    ⚠ Missing "About" or "Our Story" section             │ │
│  │    ✓ Testimonials section enabled                        │ │
│  │    ⚠ FAQ section disabled — recommended for SEO         │ │
│  │                                                          │ │
│  │  ─── AI Suggestions ───                                 │ │
│  │  "Add a 'Before & After' gallery to boost engagement"   │ │
│  │  "Enable the FAQ section — salons with FAQ rank 23%     │ │
│  │   higher in local search"                                │ │
│  └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Changes

**1. New edge function: `supabase/functions/ai-website-analysis/index.ts`**
- Accepts the full site config (pages, sections, nav items, site settings) as JSON
- Runs a two-pass analysis:
  - **Pass 1 (deterministic)**: Rule-based checks (missing SEO fields, disabled high-value sections, no CTA buttons, missing nav links, empty content blocks). Produces a structured findings list with category, severity, and points.
  - **Pass 2 (AI)**: Sends the config + rule findings to Lovable AI (gemini-3-flash-preview) with a salon-industry-specific prompt. AI returns: overall narrative, enhancement suggestions, content tone feedback, and competitive positioning tips.
- Returns: `{ score: number, categories: [...], findings: [...], aiSuggestions: [...] }`

**2. New hook: `src/hooks/useWebsiteAnalysis.ts`**
- Wraps the edge function call with loading/error state
- Caches results in React Query (5-minute stale time)
- Exposes `analyze()`, `data`, `isLoading`, `clearAnalysis()`

**3. New component: `src/components/dashboard/website-editor/panels/StructureInsightsTab.tsx`**
- Renders the scored report with collapsible category sections
- Each finding is clickable — navigates to the relevant section/page tab in the editor
- Score uses a circular progress ring with color coding (red <50, amber 50-75, green >75)
- AI suggestions in a distinct card at the bottom with the Zura sparkle icon
- "Re-analyze" button with loading state
- Follows design tokens: `font-display` for headers, `font-sans` for body, no `font-bold`

**4. Update Structure Panel (`StructurePanel.tsx`)**
- Add fourth tab: `{ mode: 'insights', label: 'Insights', icon: Sparkles }`
- Extend `StructureMode` type to include `'insights'`

**5. Update WebsiteSectionsHub (`WebsiteSectionsHub.tsx`)**
- Render `StructureInsightsTab` when `structureMode === 'insights'`
- Pass pages config, sections config, site settings, and nav items to the tab
- Wire finding clicks to `handleTabChange` so clicking a finding navigates to that section

**6. Update `supabase/config.toml`** — register the new edge function with `verify_jwt = false`

### Rule-Based Checks (Pass 1)

| Category | Check | Points | Severity |
|----------|-------|--------|----------|
| SEO | Each page has `seo_title` | 3 | warn |
| SEO | Each page has `seo_description` | 3 | warn |
| SEO | Home page hero has heading text | 2 | error |
| SEO | FAQ section enabled (schema markup potential) | 2 | info |
| Conversion | Hero has CTA button configured | 5 | error |
| Conversion | Booking/contact CTA exists on services page | 4 | warn |
| Conversion | Phone/email in footer | 3 | warn |
| Conversion | Testimonials section enabled | 3 | info |
| Conversion | New client offer section enabled | 2 | info |
| Content | No empty section labels | 2 | warn |
| Content | Brand statement length (50-200 chars ideal) | 2 | info |
| Content | Spelling check on visible text fields | 3 | warn |
| Structure | At least 5 sections enabled on home | 3 | warn |
| Structure | About/story page exists and enabled | 3 | warn |
| Structure | Gallery section with images | 2 | info |
| Structure | Nav has 3+ links | 2 | warn |
| Structure | Footer CTA enabled | 2 | info |

### AI Prompt Strategy
The system prompt instructs the model to act as a salon website conversion specialist. It receives the structured findings and raw config, then provides:
- 3-5 enhancement suggestions specific to the salon industry
- Content tone assessment (professional, friendly, luxury, etc.)
- Missing section recommendations based on high-performing salon sites
- One "quick win" that can be done in under 2 minutes

### What This Does NOT Do (Phase Boundaries)
- Does not auto-fix issues (recommend only — user applies changes)
- Does not crawl the live published site (analyzes config data only)
- Does not track score history over time (future: store snapshots)
- Does not analyze competitor sites (future: Firecrawl integration)

