

# Paywall Conversion Optimization Plan

After analyzing the full page (1,138 lines, 9 sections), here are the highest-impact changes ranked by expected conversion lift:

---

## 1. Personalized, Value-Anchored CTA Copy

**Problem:** "Activate Backroom" is feature-focused, not outcome-focused. Salon owners care about money recovered, not product names.

**Fix:** Update the `ActivateButton` to dynamically show the user's projected savings when available:
- With estimate: **"Start Recovering $X/yr →"**
- Without estimate: **"Start Recovering Revenue →"**
- Add a micro-line of risk reversal beneath: "30-day money-back guarantee"

This personalizes the CTA using data already calculated on the page.

---

## 2. Mid-Page CTAs After High-Emotion Sections

**Problem:** Only two CTAs exist — hero (top) and final (bottom). The user scrolls through loss stats and competitor comparison with no way to convert at peak motivation.

**Fix:** Add `<ActivateButton />` + guarantee micro-text after:
- **Section 3** (Loss Aversion Stats) — right after seeing their losses
- **Section 5** (Competitor Comparison) — right after seeing Zura wins

These are lightweight additions using the existing shared component.

---

## 3. Trust/Proof Bar Near Hero

**Problem:** Social proof is a single testimonial placed after the Before/After section. First-time visitors have no credibility signal in the first viewport.

**Fix:** Add a subtle trust strip directly below the hero CTA with 2–3 proof points:
- "200+ salons tracking" · "30-day guarantee" · "Setup in minutes"

Styled as a horizontal row of muted text with small icons, consistent with the existing design language.

---

## 4. Sticky Bottom CTA Bar on Scroll

**Problem:** On a long-scroll page (~9 sections), users who are ready to convert must scroll to find the button.

**Fix:** Add a sticky bottom bar that appears after the user scrolls past the hero CTA (using IntersectionObserver on the hero button ref). Contains:
- Compact savings summary (e.g., "Est. $X/yr recovered")
- CTA button
- Dismissible with a small close button
- Glass-bento aesthetic (bg-card/80, backdrop-blur-xl, border-t)

---

## 5. Strengthen Social Proof Section

**Problem:** One testimonial with no photo, title, or salon details. Feels hypothetical.

**Fix:**
- Add salon owner name, title, and location (e.g., "Jamie Torres, Owner · Austin, TX")
- Add a second testimonial for variety (different salon size/use case)
- Add a quantified result line above the quotes: e.g., "Salon owners recover an average of $2,400/mo in color costs"

---

## Technical Scope

All changes are in **one file**: `BackroomPaywall.tsx`
- Personalized CTA: modify `ActivateButton` component (~5 lines)
- Mid-page CTAs: add 2 small blocks after sections 3 and 5 (~10 lines each)
- Trust bar: new ~15-line block below hero
- Sticky bar: new ~40-line component using `useRef` + `IntersectionObserver` (already imported `useRef`)
- Social proof: expand existing blockquote section (~20 lines)

No new dependencies. No database changes. No new files.

