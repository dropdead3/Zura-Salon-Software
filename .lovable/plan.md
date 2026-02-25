

## Wire Level Tooltips to Database

Good catch — both level info tooltips (on the flip card and on the section filter) are hardcoded with 4 static levels. Your database has 7 active levels with their own labels and descriptions that you manage in Settings. This plan wires both tooltips to the real data.

### Current State
Two hardcoded tooltip lists showing only 4 levels:
- `StylistFlipCard.tsx` lines 127-131
- `StylistsSection.tsx` lines 607-611

### Database Levels (for reference)
| client_label | label | description |
|---|---|---|
| Level 1 | New Talent | Rising talent building their craft |
| Level 2 | Studio Artist | Highly talented in most general services |
| Level 3 | Core Artist | Skilled stylist with proven expertise |
| Level 4 | Lead Artist | Master artist & senior specialist |
| Level 5 | Senior Artist | Elite specialist in general and advanced services |
| Level 6 | Signature Artist | Signature artist with distinguished reputation |
| Level 7 | Icon Artist | Icon-level artist at the pinnacle of the craft |

### Technical Changes

**File: `src/components/home/StylistsSection.tsx`**
1. Import `useStylistLevels` from `@/hooks/useStylistLevels`
2. Call the hook inside the component to fetch levels from the database
3. Replace the hardcoded `<ul>` (lines 607-611) with a `.map()` over fetched levels, rendering `client_label` and `description` dynamically
4. Also replace the `stylistLevels` import from `@/data/stylists` with the database levels for the filter buttons (line 630), mapping `client_label` as the display name

**File: `src/components/home/StylistFlipCard.tsx`**
1. Add a `levels` prop to `StylistFlipCardProps` — an array of `{ clientLabel: string; description: string }` passed down from the parent
2. Replace the hardcoded `<ul>` (lines 127-131) with a `.map()` over the `levels` prop
3. The parent (`StylistsSection`) will pass the fetched levels down

### Why pass as prop instead of calling the hook in FlipCard?
The FlipCard renders per stylist — calling `useStylistLevels` in each card would create redundant subscriptions. Fetching once in the parent and passing down is cleaner.

### Files Changed
- `src/components/home/StylistsSection.tsx` — fetch levels, replace hardcoded tooltip and filter buttons
- `src/components/home/StylistFlipCard.tsx` — accept levels prop, replace hardcoded tooltip

