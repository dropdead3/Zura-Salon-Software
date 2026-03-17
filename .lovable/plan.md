

# Replace Platform Loader Spinners with Zura Z Disco Icon

## What
Replace all `Loader2 animate-spin` loading indicators across platform components with the Zura Z pixel grid using the existing disco shimmer animation, sized at ~100×100px.

## How

### 1. Add `xl` size to `ZuraLoader` component
The existing `ZuraLoader` already has the disco animation (`zura-shimmer` class). Add an `xl` size preset that produces a ~100×100px grid:
- Cell size: ~12px (`h-3 w-3 rounded-[3px]`)
- Gap: `gap-0.5` (2px)
- 7 cells × 12px + 6 × 2px = 96px ≈ 100px

Also add a `platformColors` prop so lit cells use `bg-violet-400/80 border-violet-500/20` instead of `bg-foreground/80`.

### 2. Replace full-page/section loading states in platform files
Swap the centered `<Loader2 className="w-5/6 h-5/6 animate-spin text-violet-400" />` patterns with `<ZuraLoader size="xl" platformColors />` in these files:

- `PlatformTeamManager.tsx` (line 136)
- `PendingInvitationsSection.tsx` (line 70)
- `PlatformAccountTab.tsx` (line 81)
- `BackroomEntitlementsTab.tsx` (line 631)
- `AccountNotesSection.tsx` (line 81)
- `BrandWebsiteScraper.tsx` (line 168)

### 3. Leave inline/button spinners alone
Small inline spinners (w-3/w-4 inside buttons like "Save", "Reject", "Resend") stay as `Loader2` — these are contextual action indicators, not page-level loading states. The Z icon is for section/page loading only.

### Files modified
- `src/components/ui/ZuraLoader.tsx` — add `xl` size + `platformColors` prop
- 6 platform component files — swap section-level Loader2 → ZuraLoader

