

# Design System Governor Audit — BackroomPaywall.tsx

## Canon Map (Extracted from `design-tokens.ts`)

| Layer | Token | Value |
|-------|-------|-------|
| Icon Box | `tokens.card.iconBox` | `w-10 h-10 bg-muted rounded-lg` |
| Icon | `tokens.card.icon` | `w-5 h-5 text-primary` |
| Section Heading | `SectionHeading` helper | `font-display text-2xl md:text-3xl font-medium tracking-wide text-center` |
| Spacing (section bottom) | — | `pb-20 md:pb-24` or `pb-24 md:pb-32` |
| Card padding (major) | — | `p-6 md:p-8` |
| Card padding (compact) | — | `p-5` |
| Shadow tiers | — | `shadow-sm` (subtle), `shadow-md` (standard), `shadow-lg`/`shadow-xl` (elevated) |
| Radius | Level 0 | `rounded-xl` (cards), Level 1 `rounded-lg` (inner), Level 2 `rounded-md` (small) |
| Half-step spacing | **Prohibited** | `space-y-3.5`, `mt-1.5`, `py-3.5` — must snap to 4px grid |

---

## Violations (23 total)

### 1. Icon Box Sizing Drift — **7 instances**
`w-11 h-11 rounded-xl` (44px, L0 radius) used where token specifies `w-10 h-10 rounded-lg` (40px, L1 radius).
- Lines: 767, 901, 1325, 1353, 1382, 1841, 1933

### 2. Section Heading Weight Drift — **2 instances**
- Line 638: `font-normal` instead of `font-medium` (Before/After heading)
- Line 2061: missing `font-medium` entirely (Confidence Layer heading)

### 3. Section Heading Casing Inconsistency — **1 instance**
- Line 638: has `uppercase` — no other `SectionHeading` uses uppercase. Remove.

### 4. Raw `<h2>` Instead of `<SectionHeading>` — **4 instances**
- Lines 638, 932, 1175, 2061 use inline `<h2>` with varying classes instead of the `SectionHeading` helper

### 5. Half-Step Spacing (non-4px grid) — **3 instances**
- `space-y-3.5` at lines 657, 685 → `space-y-4`
- `mt-1.5` at line 1947 → `mt-2`

### 6. Shadow Tier Mismatch — **6 instances**
- Section 1.85 (Reality Check) cards have no base shadow + `hover:shadow-md` while equivalent cards in Sections 4.9 and 7.5 use `shadow-sm hover:shadow-md`

### 7. Trust Card Color Hardcoding — **1 instance**  
- Line 2026: `text-emerald-300` for guarantee title — should use `text-success` semantic token for multi-theme compliance

---

## Corrections Plan

### A. Normalize icon boxes (7 edits)
Replace all `w-11 h-11 rounded-xl` with `w-10 h-10 rounded-lg` at lines 767, 901, 1325, 1353, 1382, 1841, 1933.

### B. Normalize section headings (4 edits)
Replace raw `<h2>` tags at lines 638, 932, 1175, 2061 with the `<SectionHeading>` helper. Remove `uppercase` and `font-normal` overrides from line 638.

### C. Fix half-step spacing (3 edits)
- Lines 657, 685: `space-y-3.5` → `space-y-4`
- Line 1947: `mt-1.5` → `mt-2`

### D. Normalize shadow tier on Reality Check cards (1 edit)
Line 730: Add `shadow-sm` to base card class: `"p-5 shadow-sm hover:shadow-md transition-shadow duration-200 h-full"`

### E. Fix trust card semantic color (1 edit)
Line 2026: `text-emerald-300` → `text-success`

### F. No changes to
- Hero section (intentionally elevated, larger icon boxes are hero-tier)
- Product Preview mock (decorative, not token-governed)
- FAQ accordion, location selector, checkout dialog

---

## Integrity Score

| Dimension | Score |
|-----------|-------|
| Typography | 91/100 (2 weight drifts, 1 casing, 4 raw headings) |
| Spacing | 96/100 (3 half-step violations) |
| Radius | 93/100 (7 icon box radius drifts) |
| Elevation | 94/100 (6 shadow-tier mismatches) |
| Color | 98/100 (1 hardcoded color) |
| **Overall** | **94/100** |

Post-correction target: **99/100**

