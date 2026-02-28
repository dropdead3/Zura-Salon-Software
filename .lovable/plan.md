

## Audit: Missing Editable Fields in Hero Section

### Problem
The "Your Salon" headline text is hardcoded in three places:
1. `src/components/home/HeroSection.tsx` (line 90, 215) — public site
2. `src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx` (line 45) — editor preview

The `HeroConfig` interface has no field for this static headline. Users cannot change it.

### Solution

**1. Add `headline_text` field to `HeroConfig`** (`src/hooks/useSectionConfig.ts`)
- Add `headline_text: string` to the interface (line ~77)
- Add default `headline_text: "Your Salon"` to `DEFAULT_HERO` (line ~326)

**2. Add editor input** (`src/components/dashboard/website-editor/HeroEditor.tsx`)
- Insert a `CharCountInput` for "Headline Text" between the Eyebrow section and the Rotating Words section (~line 91), with `maxLength={30}` and description "The static headline above the rotating words"

**3. Update preview** (`src/components/dashboard/website-editor/previews/HeroSectionPreview.tsx`)
- Replace hardcoded `Your Salon` on line 45 with `{config.headline_text}`

**4. Update public site** (`src/components/home/HeroSection.tsx`)
- Replace both hardcoded `Your Salon` instances (lines 90, 215) with `{heroConfig.headline_text}` (or equivalent from whatever config variable is used there)

### Scope
Four files, one new field. No database migration needed — `headline_text` falls back to the default when absent from stored config.

