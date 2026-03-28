

## Problem

Typography doctrine requires all uppercase text to use `font-display` (Termina). Across 22 files, `font-sans` (Aeonik Pro) is paired with `uppercase` — a direct violation that creates visual inconsistency.

## Scope

**22 files** with `font-sans` + `uppercase` violations. Each instance needs `font-sans` replaced with `font-display` and tracking adjusted to `tracking-wide` or `tracking-wider` (Termina standard).

Some instances are **form labels** or **dropdown menu labels** — these are a judgment call. Form labels in uppercase are eyebrow-style elements and should use `font-display`. Dropdown section labels similarly benefit from Termina.

## Files & Changes

### Category 1: Dashboard / Analytics (9 files)

| File | Lines | Context |
|------|-------|---------|
| `ColorBarInventoryValuationCard.tsx` | 149, 153, 157 | "At Cost", "At Retail", "Margin" stat labels |
| `QuickProductButtons.tsx` | 24 | "Quick Add" label |
| `ColorBarDashboardOverview.tsx` | 530 | Stat tile label |
| `ColorBarPaywall.tsx` | 506, 641 | Paywall eyebrow text |
| `AllowanceCalculatorDialog.tsx` | 1654 | "Total Allowance" label |
| `AppointmentDetailSheet.tsx` | 887, 909, 930 | Dropdown section labels ("Actions", "Navigate", "Status Override") |
| `WebsiteSettingsContent.tsx` | 321, 363, 365 | Preview labels, CTA text |
| `BusinessCardRequests.tsx` | 233, 237, 241, 245 | Stat card labels |
| `HeadshotRequests.tsx` | 223, 227, 231, 235 | Stat card labels |

### Category 2: Public / Marketing Pages (4 files)

| File | Lines | Context |
|------|-------|---------|
| `Extensions.tsx` | 859, 939, 1131, 1216, 1344, 1480, 1533 | Section eyebrows ("Find Out", "Investment", etc.) |
| `Footer.tsx` | 62, 85, 141 | Column headings ("Navigate", "Locations", "Connect") |
| `Header.tsx` | 295 | Announcement bar CTA |
| `AnnouncementBarManager.tsx` | 104 | Preview CTA |

### Category 3: Forms & Dialogs (1 file)

| File | Lines | Context |
|------|-------|---------|
| `ConsultationFormDialog.tsx` | 136, 156, 189, 208, 227, 245, 270, 295, 326, 350 | Form field labels and eyebrows |

### Category 4: Public Components (3 files)

| File | Lines | Context |
|------|-------|---------|
| `ServicesPreview.tsx` | 468 | Category eyebrow |
| `BeforeAfterSlider.tsx` | 359 | "Drag to compare" hint |
| `DrinkMenuSection.tsx` | 94 | "See more" toggle |

### Category 5: Platform / Dock (1 file)

| File | Lines | Context |
|------|-------|---------|
| `SwatchPicker.tsx` | 302, 324, 357 | Section labels in color picker |

### Excluded

- `DesignSystem.tsx` line 99 — this is documentation text describing the rule, not a UI violation

## Change Pattern

Every instance follows the same mechanical replacement:

```
// Before
font-sans ... uppercase tracking-[0.2em]

// After
font-display ... uppercase tracking-wide
```

- Replace `font-sans` → `font-display`
- Normalize tracking to `tracking-wide` or `tracking-wider` (drop custom `tracking-[0.2em]` / `tracking-[0.3em]` values — Termina's built-in tracking is `0.08em` via the font-display class)
- Remove any `font-medium` on these elements (Termina at text-xs doesn't need it for emphasis)

## Files modified
- `src/components/dashboard/color-bar/ColorBarInventoryValuationCard.tsx`
- `src/components/dashboard/color-bar/QuickProductButtons.tsx`
- `src/components/dashboard/color-bar-settings/ColorBarDashboardOverview.tsx`
- `src/components/dashboard/color-bar-settings/ColorBarPaywall.tsx`
- `src/components/dashboard/color-bar-settings/AllowanceCalculatorDialog.tsx`
- `src/components/dashboard/schedule/AppointmentDetailSheet.tsx`
- `src/components/dashboard/settings/WebsiteSettingsContent.tsx`
- `src/pages/dashboard/admin/BusinessCardRequests.tsx`
- `src/pages/dashboard/admin/HeadshotRequests.tsx`
- `src/pages/Extensions.tsx`
- `src/components/layout/Footer.tsx`
- `src/components/layout/Header.tsx`
- `src/pages/dashboard/admin/AnnouncementBarManager.tsx`
- `src/components/ConsultationFormDialog.tsx`
- `src/components/home/ServicesPreview.tsx`
- `src/components/home/BeforeAfterSlider.tsx`
- `src/components/home/DrinkMenuSection.tsx`
- `src/components/platform/color-bar/SwatchPicker.tsx`

