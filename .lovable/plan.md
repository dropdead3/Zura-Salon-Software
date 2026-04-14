

## Problem

The Sage system theme (calming mint green) currently maps to "Coastal Breeze," which is a blue/teal palette — not a good color match. There's no green-toned Quick Theme in the service category themes.

## Solution

Create a new "Herb Garden" Quick Theme with sage/green tones, add it via migration, and update the mapping.

### 1. Database migration — Add "Herb Garden" Quick Theme

Insert a new default theme into `service_category_themes` with sage green tones:

```sql
INSERT INTO public.service_category_themes (name, description, colors, is_default) VALUES (
  'Herb Garden',
  'Calming sage and mint greens for a natural feel',
  '{"Blonding": "#ecfdf5", "Color": "#a7f3d0", "Extensions": "#6ee7b7", "Extras": "#d1fae5", "Haircut": "#34d399", "Styling": "#10b981", "New Client Consultation": "gradient:teal-lime", "Block": "#1a1a1a", "Break": "#2d2d2d"}'::jsonb,
  false
);
```

Colors use the emerald/green spectrum (`#ecfdf5` → `#10b981`) matching Sage's HSL `145` hue.

### 2. Update theme mapping

**File: `src/hooks/useColorTheme.ts`** — Change line 47:

```typescript
sage: 'Herb Garden',  // was 'Coastal Breeze'
```

### 3. Re-map Ocean to Coastal Breeze

Since Coastal Breeze (blues/teals) is actually a better fit for Ocean than "Ocean Avenue," consider whether to swap. Current Ocean → Ocean Avenue mapping seems intentional, so we'll leave it.

### Files changed
- New migration SQL (1 INSERT)
- `src/hooks/useColorTheme.ts` (1 line change)

