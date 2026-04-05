

# Conversion Copy & Psychology Refinement

## Current Copy Assessment

The existing copy is already well-aligned with brand voice — minimal, confident, no hype. But several sections use SaaS jargon the prompt specifically bans ("utilization," "infrastructure"), and some headlines are vague or miss psychological beats. The plan below refines copy across all 10 homepage sections without changing component structure.

---

## Section-by-Section Copy Changes

### 1. Hero — CLARITY (HeroSection.tsx)

**Current headline:** "Run your salon with clarity, not chaos."
**Problem:** Good but generic. Doesn't communicate *what* Zura actually does.

**New copy:**
- Pill badge: "Trusted by 50+ salon locations" → **"Used by 50+ salon locations daily"** (adds active usage signal)
- Headline: **"Know exactly what to fix next."** with gradient on "what to fix next"
- Subheadline: **"Zura watches your schedule, team, and numbers — and tells you the one thing that will make the biggest difference this week."**
- Phase narrations refined:
  - observe: "Watching your numbers. Comparing to your benchmarks."
  - detect: "Something's off. Tuesday bookings dropped 18%."
  - act: "One fix. $4,200/mo recovered. Your call."
  - pause: "That's it. Back to running your salon."

**Psychological job:** Instant clarity — user knows what this does in 3 seconds.

---

### 2. StatBar — ORIENTATION (StatBar.tsx)

**Current label:** "Trusted by salon owners building real businesses"
**New:** **"Already running in salons like yours"**

**Metric labels refined:**
- "Locations Managed" → **"Salon locations"**
- "Revenue Monitored" → **"Revenue tracked"**
- "Stylists on Platform" → **"Stylists connected"**

**Psychological job:** Quick credibility without corporate language.

---

### 3. ChaosToClarity — PROBLEM + RELIEF (ChaosToClarity.tsx)

**Current headline:** "From noise to signal"
**Problem:** "Signal" is tech jargon.

**New copy:**
- Kicker: "The Problem" → **"Sound familiar?"**
- Headline: **"This is what running a salon feels like."** (no gradient — let it hit plain)
- Subheadline: **"Spreadsheets. Group texts. Half-answers. You're working harder than you should to figure out what's actually going on."**
- "Without Zura" label → **"Your Monday morning"**
- "With Zura" label → **"Your Monday with Zura"**
- Lever description: Keep as-is (already concrete)
- Green confirmation: "One action. Measurable impact." → **"One decision. The rest runs itself."**

**Psychological job:** Make user feel seen ("this is me"), then show relief.

---

### 4. SystemWalkthrough — UNDERSTANDING (SystemWalkthrough.tsx)

**Current headline:** "Watch Zura think"
**Problem:** Anthropomorphizing the product; slightly abstract.

**New copy:**
- Kicker: "How It Works" → **"See how it works"**
- Headline: **"Four steps. No guesswork."**
- Subheadline: "Four steps. Continuous intelligence. Zero guesswork." → **"Zura connects your data, watches for problems, and tells you what to do about them."**
- Step captions refined:
  - Connect: "Your data, unified. No manual entry." → **"Your calendar, payments, and team — connected in minutes."**
  - Observe: "Continuous monitoring. No manual reports." → **"Your numbers, tracked automatically. No spreadsheets."**
  - Detect: Current text mentions "utilization" (banned) → **"Something changed. Tuesday bookings are dropping. Here's why."**
  - Act: "One decision. Measurable impact." → **"One fix. You see the result. Move on with your day."**

**Psychological job:** Make the product feel simple and usable. Remove all jargon.

---

### 5. PersonaExplorer — RELEVANCE (PersonaExplorer.tsx)

**Current headline:** "Tell us who you are. We'll show you what changes."
**New:**
- Kicker: "Find Your Solution" → **"Built for you"**
- Headline: **"Pick your role. See what changes."** (shorter, more direct)
- Subheadline: Remove "Select your role and the problems..." → **"Different operators have different problems. Start with yours."**
- Problem prompt: "What keeps you up at night?" → **"What's frustrating you most?"** (less dramatic, more grounded)

**Psychological job:** Personalization creates "this is for me" feeling.

---

### 6. OutcomeMetrics — BELIEF (OutcomeMetrics.tsx)

**Current headline:** "Results salon owners are seeing"
**New:**
- Kicker: "Results" → **"What's changing"**
- Headline: **"Real numbers from real salons."**
- Context lines refined (remove jargon):
  - "Clarity on what's profitable changes everything" → **"Owners see where money is lost — and stop the bleeding"**
  - "Know what's happening without digging through reports" → **"Less time in spreadsheets. More time in the salon."**
  - "Structured training replaces guesswork" → **"New hires get productive faster with a clear path"**

**Psychological job:** Grounded proof. No hype, just outcomes.

---

### 7. BuiltByOperators — TRUST (BuiltByOperators.tsx)

**Current headline:** "We didn't study salons. We ran them."
**Assessment:** This is already excellent. Keep as-is.

**One refinement:**
- Second paragraph: "...stop waiting for software companies to understand their business." → **"...stop waiting for someone else to build what they needed."**

**Psychological job:** Credibility through shared experience.

---

### 8. TestimonialSection — AUTHORITY (TestimonialSection.tsx)

**Current headline:** "What operators are saying"
**New:**
- Kicker: "Owner Stories" → **"From operators"**
- Headline: **"They had the same problems you do."**

**Psychological job:** Peer validation — "people like me use this."

---

### 9. FinalCTA — ACTION (FinalCTA.tsx)

**Current headline:** "See what clarity looks like."
**New:**
- Headline: **"See it working. With your numbers."** (gradient on "your numbers")
- Subline 1: "No commitment. No credit card." → **"15 minutes. No commitment. No credit card."** (adds time anchor — reduces perceived friction)
- Subline 2: Keep trust signal as-is

**Psychological job:** Make the next step feel small and safe.

---

## Files Modified

| File | Changes |
|------|---------|
| `HeroSection.tsx` | Headline, subheadline, pill badge, phase narrations |
| `StatBar.tsx` | Section label, metric labels |
| `ChaosToClarity.tsx` | Kicker, headline, subheadline, side labels, confirmation text |
| `SystemWalkthrough.tsx` | Kicker, headline, subheadline, all 4 step captions |
| `PersonaExplorer.tsx` | Kicker, headline, subheadline, problem prompt |
| `OutcomeMetrics.tsx` | Kicker, headline, context lines |
| `BuiltByOperators.tsx` | One paragraph tweak |
| `TestimonialSection.tsx` | Kicker, headline |
| `FinalCTA.tsx` | Headline, subline |

**9 files modified. 0 new. 0 deleted. Copy-only changes — no structural or layout modifications.**

