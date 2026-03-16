

# Micro-Polish Refinement Pass — Zura Backroom Paywall

## Current State Assessment

The page has 14 sections all using identical `pb-20 md:pb-24` spacing on a uniform background. Multiple sections are visually redundant (Sections 4.85 and 4.97 are near-identical 6-step workflow flows; the hero also cycles through 6 steps). CTAs appear after almost every section, diluting urgency. There are no background tone shifts, no breathing-room variation, and no visual transitions between sections.

## Changes (all in `BackroomPaywall.tsx`)

### 1. Alternating Background Tones
Add subtle `bg-muted/20 rounded-2xl` wrappers to every other section to create visual rhythm. Sections that get the tinted background: Before/After (1.75), What You Get (4), ROI Proof (4.75), Control Layer Hub (4.95), Hardware (6), Confidence Layer (7.5). This creates a light/tinted/light/tinted cadence.

Implementation: Wrap those `<section>` tags with an additional `<div className="bg-muted/20 -mx-6 sm:-mx-8 px-6 sm:px-8 rounded-2xl">` or apply `bg-muted/20 rounded-2xl -mx-6 px-6 sm:-mx-8 sm:px-8` directly to the section element.

### 2. Remove Redundant Section (4.85 — "See It In Action")
This is a 6-step icon flow that duplicates Section 4.97 ("Under The Hood") almost exactly. The hero already cycles through the same steps. Remove Section 4.85 entirely (lines ~1137–1171) to improve scroll rhythm and reduce repetition.

### 3. Vary Section Spacing
Instead of uniform `pb-20 md:pb-24` everywhere, introduce a rhythm:
- **Dense sections** (How It Works, Hardware): `pb-16 md:pb-20`
- **Standard sections** (feature cards, comparison): `pb-20 md:pb-24` (keep as-is)
- **Breathing sections** (after interactive reveal, before pricing, before final CTA): `pb-24 md:pb-32`

This creates pacing variation that prevents the page from feeling metronomic.

### 4. Reduce CTA Frequency
Remove mid-section CTAs from: Section 1.75 (Before/After), Section 4 (What You Get), Section 4.75 (ROI Proof). Keep CTAs only at: Hero, after Interactive Feature Reveal, after Operational Intelligence, after Pricing, Confidence Layer, and Final CTA. This reduces from ~8 CTAs to ~6, making each feel more intentional.

### 5. Add Section Dividers
Between major story transitions, add a thin decorative divider:
```tsx
<div className="flex justify-center py-4">
  <div className="w-12 h-px bg-border/40" />
</div>
```
Place between: Problem → How It Works, Competitor Comparison → ROI Proof, and Pricing → Trust/FAQ. These create soft "chapter breaks."

### 6. Enhance Card Depth on Key Sections
For the Operational Intelligence cards (Section 4.9) and Confidence Layer cards (Section 7.5), upgrade from `shadow-sm` to `shadow-md hover:shadow-lg` with `transition-shadow duration-200`. This gives the most important information sections slightly more visual weight.

### 7. Hero Breathing Room
Increase hero bottom spacing from `pb-20 md:pb-24` to `pb-24 md:pb-32` to give the hero more visual importance as the opening statement.

### 8. Tighten Inline Margins
- Section headings (`SectionHeading` / `h2`): add `mb-2` between heading and subtitle where spacing feels loose
- The FAQ accordion items: reduce trigger padding from `py-3.5` to `py-3` for denser but still readable FAQ

## Section Order After Changes
1. Hero (breathing room below)
1.5. Product Preview
1.75. Before/After *(tinted bg, CTA removed)*
— *thin divider* —
2. Problem / Loss Aversion
3. How It Works *(tighter spacing)*
4. What You Get *(tinted bg, CTA removed)*
4.25. Interactive Feature Reveal *(breathing room below)*
— *thin divider* —
4.5. Competitor Comparison
4.75. ROI Proof *(tinted bg, CTA removed)*
4.9. Operational Intelligence *(enhanced card depth)*
4.95. Control Layer Hub *(tinted bg)*
4.97. Under The Hood
— *thin divider* —
5. Pricing + ROI *(breathing room below)*
6. Hardware *(tinted bg, tighter spacing)*
7. Trust + FAQ
7.5. Confidence Layer *(tinted bg, enhanced card depth)*
8. Final CTA

Total edits: ~15 small class changes, 1 section removal (~35 lines), 3 divider insertions.

