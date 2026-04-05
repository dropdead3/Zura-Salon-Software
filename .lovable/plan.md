

# Sequential Marketing Front-End Improvements — Full Plan

Five items, executed in order. Each builds on the last.

---

## 1. Wire Up the Demo Request Form

**Problem:** `ProductDemo.tsx` sets `setSubmitted(true)` on submit but never saves anything. The primary conversion endpoint is a dead end.

**Solution:**
- Import `captureWebsiteLead` from `@/lib/leadCapture.ts` into `ProductDemo.tsx`
- Map form fields: `name`, `email`, `locations` → `message` (or `preferred_location`), `challenge` → `preferred_service`
- Add loading state, error handling, and toast feedback
- Add basic validation (name required, email format check) before submission
- The `salon_inquiries` table already has the right columns and RLS allows anonymous inserts via `website_form` source

**Files:** `src/pages/ProductDemo.tsx` (modify)

---

## 2. Add SEO Meta Tags Across All Marketing Pages

**Problem:** `PlatformLanding.tsx`, `Product.tsx`, `Ecosystem.tsx`, all 7 solution pages, and `ProductDemo.tsx` have zero meta tags. The `Pricing.tsx` page uses `Helmet` directly but without OG/Twitter cards. The `SEO` component exists but is only used on the tenant-side About page.

**Solution:**
- Create a lightweight `MarketingSEO` component (since the existing `SEO` component pulls from `useBusinessSettings` which is tenant-scoped and inappropriate for platform marketing)
- It accepts `title`, `description`, `image?`, `path?` and renders `<Helmet>` with `<title>`, meta description, OG tags (og:title, og:description, og:image, og:url, og:type), and Twitter cards
- Add `<MarketingSEO>` to every marketing page:
  - `PlatformLanding.tsx` — "Salon Intelligence Platform — Run your salon with clarity"
  - `Product.tsx` — "How It Works"
  - `Ecosystem.tsx` — "Ecosystem"
  - `Pricing.tsx` — replace raw `<Helmet>` with `<MarketingSEO>`
  - `ProductDemo.tsx` — "Request a Demo"
  - All 7 solution pages via `SolutionPageTemplate.tsx` (add `seoTitle?` and `seoDescription?` props)

**Files:** New `src/components/marketing/MarketingSEO.tsx`, modify 4 page files + `SolutionPageTemplate.tsx` + 7 solution pages (props only)

---

## 3. Rebuild About Page with MarketingLayout

**Problem:** The About page at `/about` uses the tenant `<Layout>` shell (dashboard header/footer, light theme) instead of the marketing `<MarketingLayout>`. It looks like a completely different site.

**Solution:**
- Replace `<Layout>` with `<MarketingLayout>` in `About.tsx`
- Remove `<SEO>` (tenant) and add `<MarketingSEO>`
- Rebuild the 5 sub-components (`AboutHero`, `ValuesSection`, `StatsSection`, `StorySection`, `JoinTeamSection`) to use the marketing color system:
  - Dark backgrounds (`slate-950`), white/slate text
  - `font-display` for headlines, `font-sans` for body
  - Violet/dusky blue/lavender accent palette from `--mkt-*` variables
  - `rounded-xl` cards, marketing spacing (`py-20 lg:py-28`)
  - Remove `FounderWelcome` (tenant-specific component, not relevant to platform marketing)
- `AboutHero`: Replace typewriter effect with a clean static headline + description (matches the confident, minimal marketing tone)

**Files:** Modify `src/pages/About.tsx`, modify all 5 files in `src/components/about/`

---

## 4. Add Logo/Integration Partners Bar

**Problem:** `LogoBar.tsx` exists but uses placeholder text ("Salon A", "Salon B"). It's not rendered on the landing page. There's no social proof strip.

**Solution:**
- Redesign `LogoBar.tsx` as an integration partners bar rather than client logos (more credible when you don't have named clients yet)
- Show recognizable tool names that Zura replaces/integrates with: "Google Calendar", "Square", "Stripe", "QuickBooks", "Mailchimp", "Instagram"
- Use a subtle infinite horizontal scroll animation for dynamism
- Render the `<LogoBar />` in `PlatformLanding.tsx` between `<StatBar />` and `<ProblemStatement />`
- Style: `font-display text-xs tracking-[0.15em] text-slate-500` for names, faint border pills, auto-scroll on mobile

**Files:** Modify `src/components/marketing/LogoBar.tsx`, modify `src/pages/PlatformLanding.tsx`

---

## 5. Elevate the Pricing Page

**Problem:** The pricing page works but lacks interactive polish — no monthly/annual toggle, no feature comparison, and the FAQ section is adequate but plain.

**Solution:**
- Add a monthly/annual billing toggle with animated savings badge ("Save 20%")
- Add annual pricing: Solo $79/mo, Multi-Location $160/location/mo (billed annually)
- Add a feature comparison table below the cards: rows for key features, columns for tiers, check/dash markers
- Style the comparison table with the marketing design system (slate borders, `font-sans` body, `font-display` tier headers)
- Tier cards: standardize to `rounded-xl`, add `<MarketingSEO>`
- FAQ: already good — minor cleanup only (ensure accordion uses marketing tokens)

**Files:** Modify `src/pages/Pricing.tsx`

---

## Execution Order

1. Demo form wiring (quick, high-impact)
2. SEO component + all page tags (foundational)
3. About page rebuild (visual consistency)
4. Logo bar integration (social proof)
5. Pricing elevation (conversion polish)

**Total: ~4 new files, ~18 files modified, 0 deleted.**

