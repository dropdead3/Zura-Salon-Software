

# Marketing Front-End — Round 3 Polish & Fixes

## Issues Found

### 1. Mobile nav menu bleeds through to footer
The mobile menu (`MarketingNav.tsx` line 104) uses `bg-slate-950/95` but doesn't have a solid bottom edge or sufficient height — the footer content is visible underneath it. The menu needs `min-h-[calc(100vh-64px)]` or a full-screen overlay approach to prevent bleed-through.

### 2. Solution page testimonials use `font-serif italic`
`SolutionPageTemplate.tsx` line 112 still uses `font-serif text-xl italic` on the testimonial blockquote — this was fixed on the homepage `TestimonialSection` but not here. Should be `font-sans` for brand consistency.

### 3. Solution page CTA section is thin
The solution page bottom CTA (lines 126-142) has only a headline, one line of text, and a button. No trust signal, no secondary CTA — unlike the homepage `FinalCTA` which now has both. Should mirror that pattern.

### 4. Nav missing "About" link
The desktop nav has no way to reach `/about` — it's only in the footer. Adding it to the Company column was good, but the nav itself should also surface it (either as a direct link or under a "Company" dropdown). Given the minimal nav, adding it as a plain link alongside Ecosystem/Pricing is the simplest fix.

### 5. Pricing "Start Free Trial" buttons go to `/demo`
Both Solo and Multi-Location CTAs say "Start Free Trial" but link to the demo request form. Either the copy should say "Get a Demo" (consistent with the rest of the site) or these should link to actual signup. Since there's no self-serve signup flow yet, the labels should read "Get a Demo" to avoid confusion.

### 6. Pricing feature comparison table missing
The plan called for a feature comparison table below the tier cards. Let me verify if it was built.

### 7. Hero "Explore the Platform" ghost CTA has no gradient or lavender styling
The hero secondary CTA (line 37-42) uses plain `bg-white/5 border-white/10` — it doesn't use the new lavender ghost style that was applied to the FinalCTA's secondary button. Should be consistent.

### 8. Large empty space between sections on landing page
Scrolling the landing page shows what looks like excessive vertical padding between sections — the page feels like it has dead zones between the mid-page sections (StatBar → LogoBar → ProblemStatement gap appears large).

---

## Plan

### 1. Fix mobile nav overlay
Change the mobile menu container to a full-screen overlay with solid background so footer doesn't bleed through. Add `fixed inset-0 top-[64px]` with solid `bg-slate-950` and overflow scroll.

**File:** `src/components/marketing/MarketingNav.tsx`

### 2. Fix SolutionPageTemplate testimonial font
Replace `font-serif text-xl sm:text-2xl italic` with `font-sans text-lg sm:text-xl` on the blockquote for brand consistency.

**File:** `src/components/marketing/SolutionPageTemplate.tsx`

### 3. Strengthen SolutionPageTemplate bottom CTA
Add a trust signal line and secondary ghost CTA (matching the homepage FinalCTA pattern). Add gradient accent on the headline.

**File:** `src/components/marketing/SolutionPageTemplate.tsx`

### 4. Add "About" link to desktop nav
Add "About" to the `navLinks` array in `MarketingNav.tsx`.

**File:** `src/components/marketing/MarketingNav.tsx`

### 5. Fix Pricing CTA labels
Change "Start Free Trial" to "Get a Demo" on Solo and Multi-Location tiers since there's no self-serve trial flow.

**File:** `src/pages/Pricing.tsx`

### 6. Unify hero ghost CTA with lavender style
Update the "Explore the Platform" button in `HeroSection.tsx` to use the same lavender ghost styling as the FinalCTA secondary button: `border-[hsl(var(--mkt-lavender)/0.3)] text-[hsl(var(--mkt-lavender))]`.

**File:** `src/components/marketing/HeroSection.tsx`

---

## Summary

| File | Change |
|------|--------|
| `MarketingNav.tsx` | Fix mobile menu overlay bleed-through, add About link |
| `SolutionPageTemplate.tsx` | Fix testimonial font, strengthen bottom CTA |
| `Pricing.tsx` | Fix "Start Free Trial" → "Get a Demo" labels |
| `HeroSection.tsx` | Unify ghost CTA with lavender styling |

**4 files modified. 0 new. 0 deleted.**

