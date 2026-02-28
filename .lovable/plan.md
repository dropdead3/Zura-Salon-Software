

## Enhance Left-Side Editor Menu Organization

### Problem
The "Site Content" section is a flat list of 8 items mixing global elements (Announcement Bar, Footer) with content managers (Services, Gallery, Stylists). This makes it harder to scan and understand what each item controls.

### Solution
Split the flat "Site Content" list into two clearly labeled sub-groups, and refine the visual hierarchy between site-wide elements and content managers vs. the homepage layout sections below.

### Changes: `src/components/dashboard/website-editor/panels/StructureLayersTab.tsx`

**1. Reorganize SITE_CONTENT_ITEMS into two groups:**

```text
GLOBAL ELEMENTS          (site-wide, always present)
  Announcement Bar
  Footer CTA
  Footer

CONTENT MANAGERS         (data sources used by sections)
  Services
  Testimonials
  Gallery
  Stylists
  Locations
```

**2. Render two `SectionGroupHeader` blocks** instead of the single "Site Content" header — one for "Global Elements" and one for "Content Managers", each with its own item list.

**3. Adjust the divider** between content managers and "Homepage Layout" to use a slightly stronger visual separator (e.g., thicker spacing or a subtle background band on the "Homepage Layout" label).

### Changes: `src/components/dashboard/website-editor/SectionGroupHeader.tsx`

No structural change needed — the existing component works for the new group titles.

### Visual Structure
```text
┌──────────────────────────┐
│ GLOBAL ELEMENTS          │
│   Announcement Bar       │
│   Footer CTA             │
│   Footer                 │
├──────────────────────────┤
│ CONTENT MANAGERS         │
│   Services               │
│   Testimonials           │
│   Gallery                │
│   Stylists               │
│   Locations              │
├══════════════════════════┤
│ HOMEPAGE LAYOUT          │
│ ─ Above the Fold ─       │
│   Hero Section           │
│   Brand Statement        │
│ ─ Social Proof ─         │
│   Testimonials           │
│   Partner Brands         │
│   ...                    │
└──────────────────────────┘
```

### Scope
Single file change (`StructureLayersTab.tsx`): split the `SITE_CONTENT_ITEMS` array into two arrays and render them under separate group headers.

