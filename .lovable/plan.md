

## Zura Theme Infrastructure System -- Production Architecture Plan

### Prompt Assessment

This is a strong architectural vision document. The separation of content from presentation, the slot-binding concept, and the integrity scoring system are all well-conceived. Two refinements for future prompts: (1) The "Canonical Content Store" concept needs to acknowledge that Zura already HAS structured business data in dedicated tables (`services`, `employee_profiles`, `locations`, `clients`, etc.) -- the content store should be a resolution layer on top of existing data, not a parallel store. Calling that out prevents redundant schema design. (2) The "SectionType" entity overlaps with the existing `BUILTIN_SECTION_TYPES` and `CUSTOM_SECTION_TYPES` arrays -- explicitly stating "extend existing section type system" vs "replace it" would clarify scope.

---

### Current State Analysis

**Existing theme infrastructure is skeletal:**

- `website_themes` table: 6 seeded themes with `color_scheme`, `typography_preset` (JSONB), `layout_config` (JSONB), `default_sections` (JSONB -- all empty `{}`). No versioning, no blueprints, no slot system, no organization scoping.
- `site_settings.website_active_theme`: Stores `{ theme_id, activated_at, customized }`. No snapshot, no migration history.
- `site_settings.website_pages`: Stores the entire page/section tree as a flat JSONB blob. Content is embedded directly in page configs -- NOT theme-agnostic.
- Section types: Hardcoded arrays in `useWebsiteSections.ts`. 13 built-in + 5 custom types. No database-backed section type registry.
- Rendering: `PageSectionRenderer` maps section types to React components via a static `BUILTIN_COMPONENTS` record. No slot binding. No content resolution.
- Business data: Services, staff, locations, testimonials, FAQs, brands, drinks all live in dedicated org-scoped tables already. Section components fetch their own data directly (e.g., `HeroSection` reads from `site_settings`, `ServicesPreview` reads from `services` table).

**Key architectural gap:** Content is currently interleaved with layout. Switching themes means losing or manually migrating page configs. There is no content portability layer.

---

### Architecture Plan

This plan introduces the theme infrastructure in layers, preserving backward compatibility with existing section components while building the new system underneath.

#### Phase Boundary

This plan covers: database schema, TypeScript type system, content resolver hook, theme switching engine, blueprint validation, and integrity scoring. It does NOT cover: re-rendering existing section components through slots (that's a per-component migration), AI hook extensions, or performance budgeting enforcement in the editor UI.

---

### 1. Database Schema

#### 1a. Evolve `website_themes` into full Theme entity

Add columns to existing table (migration, not replacement):

```text
website_themes (ALTERED)
  + version TEXT NOT NULL DEFAULT '1.0.0'
  + category TEXT NOT NULL DEFAULT 'general'    -- salon, spa, barbershop, wellness
  + status TEXT NOT NULL DEFAULT 'active'       -- active, deprecated, experimental
  + supported_features JSONB DEFAULT '{}'       -- feature flags
  + compatibility_rules JSONB DEFAULT '{}'      -- min platform version, etc.
  + blueprint JSONB NOT NULL DEFAULT '{}'       -- ThemeBlueprint (see below)
  + updated_at TIMESTAMPTZ DEFAULT now()
  + organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE  -- NULL = platform-builtin
```

RLS: Platform-builtin themes (`organization_id IS NULL`) readable by all authenticated users. Org-specific custom themes scoped by `is_org_member`.

#### 1b. New table: `theme_section_types`

Registry of semantic section types (replaces hardcoded arrays):

```text
theme_section_types
  id TEXT PRIMARY KEY                         -- 'hero', 'services', 'proof', 'gallery', etc.
  semantic_category TEXT NOT NULL             -- 'hero', 'services', 'proof', 'gallery', 'cta', 'contact', 'content', 'media', 'spacing'
  canonical_fields_schema JSONB NOT NULL     -- JSON Schema defining expected fields
  allowed_field_types TEXT[] DEFAULT '{}'
  max_instances_per_page INTEGER DEFAULT NULL -- NULL = unlimited
  is_portable BOOLEAN DEFAULT true
  transformation_rules JSONB DEFAULT '{}'
  performance_weight INTEGER DEFAULT 1        -- 1-10 scale
  is_builtin BOOLEAN DEFAULT true
  created_at TIMESTAMPTZ DEFAULT now()
```

Seed with current 13 built-in + 5 custom types. RLS: public read.

#### 1c. New table: `canonical_content`

Organization-scoped, theme-agnostic content store:

```text
canonical_content
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  content_key TEXT NOT NULL                   -- 'brand.name', 'brand.tagline', 'cta.primary', 'about.short', etc.
  content_type TEXT NOT NULL DEFAULT 'text'   -- text, rich_text, image, url, list, structured
  value JSONB NOT NULL DEFAULT '{}'           -- { "text": "..." } or { "url": "..." } or { "items": [...] }
  source TEXT DEFAULT 'manual'                -- manual, imported, synced
  last_synced_at TIMESTAMPTZ
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(organization_id, content_key)
```

RLS: `is_org_member` for SELECT, `is_org_admin` for INSERT/UPDATE/DELETE.

This table stores ONLY content that doesn't already live in dedicated tables. For services, staff, locations, reviews -- the resolver will read from existing tables directly.

#### 1d. New table: `theme_slot_mappings`

Per-theme slot definitions with binding rules:

```text
theme_slot_mappings
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  theme_id TEXT NOT NULL REFERENCES website_themes(id) ON DELETE CASCADE
  slot_id TEXT NOT NULL                       -- 'hero.headline', 'hero.image', 'services.list'
  semantic_type TEXT NOT NULL                 -- maps to theme_section_types.semantic_category
  expected_field_type TEXT NOT NULL           -- text, image, url, service_list, staff_list, etc.
  required BOOLEAN DEFAULT false
  primary_source TEXT NOT NULL               -- content_key or table reference: 'canonical:brand.tagline' or 'table:services'
  fallback_source TEXT                       -- fallback content key
  transformation_rules JSONB DEFAULT '{}'    -- { "truncate": 160, "format": "uppercase" }
  performance_priority INTEGER DEFAULT 5     -- 1=critical, 10=optional
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(theme_id, slot_id)
```

RLS: public read (slots are theme metadata, not business data).

#### 1e. New table: `theme_activations`

Replaces `site_settings.website_active_theme` with a proper versioned activation log:

```text
theme_activations
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE
  theme_id TEXT NOT NULL REFERENCES website_themes(id)
  theme_version TEXT NOT NULL
  pre_switch_snapshot JSONB                  -- full page/section state before switch
  migration_report JSONB                     -- { mapped: [], transformed: [], attention: [] }
  activated_at TIMESTAMPTZ DEFAULT now()
  activated_by UUID REFERENCES auth.users(id)
  is_current BOOLEAN DEFAULT true
```

RLS: `is_org_member` for SELECT, `is_org_admin` for INSERT/UPDATE.

#### 1f. Alter `website_themes` blueprint structure

The `blueprint` JSONB column stores the `ThemeBlueprint` object:

```text
ThemeBlueprint = {
  required_pages: ['home'],
  default_page_templates: {
    home: { sections: [...], nav_order: 0 },
    about: { sections: [...], nav_order: 1 },
  },
  default_navigation: {
    max_top_level_items: 7,
    max_depth: 2,
    max_cta_items: 2,
    required_cta: true,
    sticky_mobile_cta: true,
  },
  url_structure: {
    pattern: '/{org-slug}/{page-slug}',
    location_pattern: '/{org-slug}/locations/{location-slug}',
  },
  allowed_section_types: ['hero', 'brand_statement', 'testimonials', ...],
  section_limits: {
    hero: { max: 1 },
    custom_cta: { max: 4 },
  },
  header_layout: 'standard',           -- standard, minimal, transparent
  footer_layout: 'standard',           -- standard, minimal, expanded
  token_overrides: {
    lockable: ['primary', 'background', 'card-radius'],
    defaults: { primary: '24.6 95% 53.1%' },
  },
  locking: {
    header_locked: true,
    footer_locked: true,
    nav_structure_locked: false,
    token_layer_locked: false,
  },
  max_page_weight: 50,                 -- sum of section performance_weights
  location_support: {
    auto_generate_pages: true,
    nav_insertion: 'under_locations',
    page_template: 'location_detail',
  },
}
```

---

### 2. TypeScript Type System

**New file: `src/types/theme-infrastructure.ts`**

Core type definitions for the entire theme system:

- `ThemeBlueprint` -- mirrors the JSONB blueprint structure
- `ThemeSlotMapping` -- slot binding definition
- `CanonicalContent` -- content store entry
- `ContentResolution` -- resolver output with source tracking
- `ThemeMigrationReport` -- mapped/transformed/attention arrays
- `ThemeIntegrityScore` -- scoring breakdown
- `SlotBindingResult` -- resolved slot with value + source + confidence

All types are pure data -- no React dependencies.

---

### 3. Content Resolver Engine

**New file: `src/hooks/useContentResolver.ts`**

A deterministic hook that resolves content for any slot:

```text
Resolution priority:
1. Page-specific override (from page section config)
2. Canonical content store (canonical_content table)
3. Live business data (services, employee_profiles, locations, etc.)
4. Theme default content (from blueprint)
5. Empty state (null with metadata)
```

The resolver:
- Takes `(themeId, slotId, pageId?)` as input
- Returns `{ value, source, type, confidence, transformApplied }`
- Validates type compatibility (e.g., slot expects `image`, source provides `text` → skip)
- Applies transformation rules (truncation, formatting)
- Handles list sources (e.g., `table:services` → fetch first N services based on slot config)

**New file: `src/hooks/useCanonicalContent.ts`**

CRUD hooks for the `canonical_content` table:
- `useCanonicalContent(orgId)` -- fetch all content for org
- `useUpdateCanonicalContent()` -- upsert a content entry
- `useSyncCanonicalContent()` -- sync from business data tables (e.g., pull org name into `brand.name`)

---

### 4. Theme Switching Engine

**New file: `src/hooks/useThemeSwitcher.ts`**

Orchestrates theme transitions:

1. `usePreSwitchAnalysis(currentThemeId, targetThemeId)`:
   - Compares current page/section config against target blueprint
   - Maps sections by `semantic_category` (not by type ID)
   - Identifies: perfectly mapped, needs transformation, unmapped
   - Returns `ThemeMigrationReport`

2. `useExecuteThemeSwitch()` mutation:
   - Creates `pre_switch_snapshot` in `theme_activations`
   - Re-maps all page sections using target blueprint's `default_page_templates`
   - Preserves canonical content bindings
   - Re-binds slots to new theme's `theme_slot_mappings`
   - Updates `website_pages` config with new section structure
   - Saves `migration_report`
   - Sets `is_current = true` on new activation, `false` on previous

3. `useRevertThemeSwitch()` mutation:
   - Reads `pre_switch_snapshot` from previous activation
   - Restores `website_pages` to snapshot state
   - Reverts `is_current` flags

All operations are deterministic and reversible.

---

### 5. Blueprint Validation Engine

**New file: `src/lib/theme-validation.ts`**

Pure functions (no hooks, no side effects) that validate site state against a blueprint:

- `validateRequiredPages(pages, blueprint)` → `ValidationResult[]`
- `validateRequiredSections(pages, blueprint)` → `ValidationResult[]`
- `validateNavigation(menuItems, blueprint)` → `ValidationResult[]`
- `validateSlotRequirements(slots, resolvedContent)` → `ValidationResult[]`
- `validatePerformanceBudget(pages, sectionTypes)` → `ValidationResult[]`
- `validatePublishReadiness(allResults)` → `{ canPublish, critical[], warnings[], info[] }`

Each `ValidationResult`:
```text
{
  rule: string,
  severity: 'critical' | 'warning' | 'info',
  passed: boolean,
  message: string,
  affectedEntity: { type, id },
}
```

Critical violations block publish. Warnings are advisory.

**Integration**: Wire into the existing Publish flow in `CanvasHeader.tsx` -- before publishing, run `validatePublishReadiness()` and show results in the publish confirmation dialog.

---

### 6. Integrity Scoring System

**New file: `src/lib/theme-integrity.ts`**

Pure scoring function:

```text
calculateIntegrity(blueprint, pages, navigation, resolvedSlots) → {
  score: number,          // 0-100
  breakdown: {
    required_sections: { score, max, violations },
    navigation: { score, max, violations },
    token_drift: { score, max, overrides },
    slot_coverage: { score, max, empty },
    page_coverage: { score, max, orphans },
    cta_compliance: { score, max, missing },
  },
  status: 'healthy' | 'warning' | 'critical',
}
```

Scoring weights:
- Required sections present: 25 points
- Navigation compliance: 20 points
- Slot coverage: 20 points
- Token drift (overrides vs defaults): 15 points
- Page coverage: 10 points
- CTA compliance: 10 points

Deductions per violation, not per item. Score is informational only -- displayed in the Inspector panel when viewing theme settings.

---

### 7. Version Migration Architecture

**New file: `src/lib/theme-migration.ts`**

When a theme's blueprint is updated (new version):

1. `diffBlueprints(oldBlueprint, newBlueprint)` → `BlueprintDiff`:
   - Added required pages
   - Removed section types
   - Changed nav limits
   - New required slots
   - Changed token defaults

2. `generateMigrationPlan(diff, currentSiteState)` → `MigrationPlan`:
   - Auto-applicable changes (non-breaking)
   - Changes requiring review (new required sections)
   - Breaking changes (removed section types in use)

3. `applyMigration(plan, siteState)` → updated site state

Theme updates are always opt-in. The system generates a preview of impact before any changes are applied.

---

### 8. Multi-Location Support

The blueprint's `location_support` config drives automatic page generation:

**New file: `src/hooks/useLocationPages.ts`**

- Watches `locations` table for changes
- When a new location is added:
  - Auto-generates a page using `blueprint.location_support.page_template`
  - Inserts nav item per `blueprint.location_support.nav_insertion`
  - Sets URL per `blueprint.location_support.url_pattern`
- When a location is removed:
  - Flags the page as orphaned (does not auto-delete)
  - Adds warning to integrity score

---

### 9. Files Summary

**Database migrations (1 migration file)**:
- Alter `website_themes`: add `version`, `category`, `status`, `supported_features`, `compatibility_rules`, `blueprint`, `updated_at`, `organization_id`
- Create `theme_section_types`
- Create `canonical_content`
- Create `theme_slot_mappings`
- Create `theme_activations`
- Seed `theme_section_types` with existing 18 section types
- Seed `blueprint` JSONB for existing 6 themes
- RLS policies for all new tables

**New TypeScript files (8)**:
- `src/types/theme-infrastructure.ts` -- core type definitions
- `src/hooks/useCanonicalContent.ts` -- content store CRUD
- `src/hooks/useContentResolver.ts` -- slot resolution engine
- `src/hooks/useThemeSwitcher.ts` -- theme switching orchestration
- `src/hooks/useLocationPages.ts` -- multi-location page sync
- `src/lib/theme-validation.ts` -- blueprint validation
- `src/lib/theme-integrity.ts` -- integrity scoring
- `src/lib/theme-migration.ts` -- version migration

**Modified files (3)**:
- `src/hooks/useWebsiteThemes.ts` -- update types to match expanded schema
- `src/hooks/useWebsiteSections.ts` -- add section type registry integration
- `src/components/dashboard/website-editor/panels/CanvasHeader.tsx` -- publish validation integration

**Preserved (no changes)**:
- All existing section renderer components -- they continue working as-is
- `PageSectionRenderer.tsx` -- slot binding is additive, not a replacement
- `site_settings` table -- remains for non-theme settings
- `section-templates.ts` -- templates continue working alongside the new system

---

### 10. What This Does NOT Include (Future Phases)

- **Per-component slot migration**: Each builtin section component (HeroSection, TestimonialSection, etc.) needs to be refactored to read from the content resolver instead of directly querying tables. This is a per-component effort done incrementally.
- **Theme marketplace / sharing**: Themes are platform-builtin or org-custom only.
- **AI optimization hooks**: The architecture supports them (integrity score + slot coverage data = optimization input) but no AI integration in this phase.
- **Performance budget enforcement in editor UI**: The scoring system calculates it, but editor-level warnings are Phase 2.
- **Custom theme builder UI**: Operators cannot create themes from scratch yet -- only activate + customize platform-builtin themes.

