

## Standardize All Inspector Section Editors to a Consistent Hybrid Shell

### Problem
The inspector panel renders wildly different UIs depending on which section is selected. Three distinct visual patterns exist:

1. **EditorCard shell** (Footer CTA, Brand Statement, etc.) — frosted glass card with sticky icon+title header, consistent padding
2. **Page-like headers** (Locations, Stylists, Services, Gallery) — full `text-xl font-display` heading with icon, buttons, info banners, stats grids. These look like standalone pages crammed into the inspector, not contextual property editors
3. **Naked field lists** (Hero, SectionDisplayEditor-based editors, CustomSectionEditor) — bare form fields with no enclosing shell at all

The user sees three completely different visual languages when clicking between sections.

### Canonical Pattern: Hybrid Shell

Every section editor rendered inside the Inspector will follow this structure:

```text
┌─────────────────────────────────────┐
│ [icon] SECTION TITLE        [Reset] │  ← EditorCard sticky header
│ Short description...                │
├─────────────────────────────────────┤
│                                     │
│  Zone A: Section Styling (existing) │  ← Already handled by renderEditor()
│                                     │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│
│                                     │
│  Zone B: Content Controls           │  ← Wrapped in EditorCard
│  • Toggle fields                    │
│  • Text inputs                      │
│  • Sliders                          │
│  • Sub-cards for complex content    │
│                                     │
└─────────────────────────────────────┘
```

### Changes by Category

#### Category C: `SectionDisplayEditor`-based editors (5 files)
**Files:** `GalleryDisplayEditor`, `LocationsDisplayEditor`, `PopularServicesEditor`, `StylistsDisplayEditor`, `ServicesPreviewEditor`

**Change:** Wrap `SectionDisplayEditor` output in an `EditorCard` shell. Add an `icon` prop to `SectionDisplayEditor` or wrap at the calling component level. The `SectionDisplayEditor` component itself will import `EditorCard` and use it as its outer container, using the existing `title` and `description` props.

**In `SectionDisplayEditor.tsx`:**
- Import `EditorCard` and a default icon
- Wrap the field list in `<EditorCard title={title} description={description} icon={icon}>...</EditorCard>`
- Add `icon` prop (optional `LucideIcon`)

#### Category B: Content manager editors (4 files)
**Files:** `LocationsContent`, `StylistsContent`, `ServicesContent`, `GalleryContent`

These are the most divergent. They have page-level headers (`text-xl font-display`), stats grids, info banners, and full CRUD UIs that look like standalone pages rather than inspector panels.

**Change for each:**
- Remove the standalone `<h2>` page header block and replace with `EditorCard` wrapper(s)
- Remove the top-level `flex items-start justify-between` header that includes buttons like "Preview" and "Edit in Settings" — relocate those as `headerActions` inside the `EditorCard`
- Info banners become part of the card content (no visual change, just contained)
- Stats grids remain but inside the card shell

Specific per-file:
- **`LocationsContent`**: Wrap in `EditorCard` with `icon={MapPin}`, title "Website Locations". Move Preview/Edit in Settings buttons to `headerActions`.
- **`StylistsContent`**: Wrap in `EditorCard` with `icon={Globe}`, title "Homepage Stylists". The "Sample Cards Settings" sub-card is already a Card — keep as internal card within EditorCard.
- **`GalleryContent`**: Wrap in `EditorCard` with `icon={Images}`, title "Gallery Manager". Stats cards become internal.
- **`ServicesContent`**: Wrap in `EditorCard` with `icon={Scissors}`, title "Services Manager". The info notice and stats grids become internal content.

#### Category D: Naked field editors (2 files)
**Files:** `HeroEditor`, `CustomSectionEditor`

**Change:**
- **`HeroEditor`**: Already has fields directly inside `space-y-5`. Wrap in `EditorCard` with `icon` (e.g., `Layout`), title "Hero Section". Move Reset button to `headerActions`. Remove standalone reset row.
- **`CustomSectionEditor`**: Wrap in `EditorCard` using a generic icon (e.g., `Layers`). The section label input becomes the first field inside the card content.

#### Category A: Already using `EditorCard` (12 files)
**No changes needed.** These already follow the canonical pattern.

### Technical Details

**`SectionDisplayEditor.tsx` modification:**
```tsx
// Add icon prop
interface SectionDisplayEditorProps<T extends object> {
  title: string;
  description: string;
  icon?: LucideIcon;  // NEW
  // ... rest unchanged
}

// Wrap render in EditorCard
return (
  <div className="space-y-6">
    <EditorCard title={title} icon={icon} description={description}>
      {fields.map((field) => { /* existing field rendering */ })}
    </EditorCard>
  </div>
);
```

**Content editor pattern (e.g., LocationsContent):**
```tsx
// BEFORE: standalone page header
<div className="flex items-start justify-between gap-4">
  <h2 className="text-xl font-display ...">Website Locations</h2>
  <Button>Preview</Button>
</div>

// AFTER: EditorCard shell
<EditorCard 
  title="Website Locations" 
  icon={MapPin}
  description="Control which locations appear on the public website"
  headerActions={<Button variant="ghost" size={tokens.button.card}>Preview</Button>}
>
  {/* Info banner, location cards, footer note — all inside */}
</EditorCard>
```

**`HeroEditor` pattern:**
```tsx
// BEFORE: standalone reset row + naked fields
<div className="space-y-5">
  <div className="flex justify-end"><Button>Reset</Button></div>
  <ToggleInput ... />
  ...
</div>

// AFTER: EditorCard shell
<EditorCard title="Hero Section" icon={Layout} headerActions={<Button>Reset</Button>}>
  <ToggleInput ... />
  ...
</EditorCard>
```

### Files Modified (18 total)

| File | Change |
|------|--------|
| `SectionDisplayEditor.tsx` | Add `icon` prop, wrap in `EditorCard` |
| `GalleryDisplayEditor.tsx` | Pass icon to `SectionDisplayEditor` |
| `LocationsDisplayEditor.tsx` | Pass icon to `SectionDisplayEditor` |
| `PopularServicesEditor.tsx` | Pass icon to `SectionDisplayEditor` |
| `StylistsDisplayEditor.tsx` | Pass icon to `SectionDisplayEditor` |
| `ServicesPreviewEditor.tsx` | Pass icon to `SectionDisplayEditor` |
| `LocationsContent.tsx` | Replace page header with `EditorCard` wrapper |
| `StylistsContent.tsx` | Replace page header with `EditorCard` wrapper |
| `GalleryContent.tsx` | Replace page header with `EditorCard` wrapper |
| `ServicesContent.tsx` | Replace page header with `EditorCard` wrapper |
| `HeroEditor.tsx` | Wrap in `EditorCard`, move Reset to `headerActions` |
| `CustomSectionEditor.tsx` | Wrap in `EditorCard` |
| `AnnouncementBarContent.tsx` | Remove standalone header (already uses EditorCard for body, but has a page-like header above it) |

### Result
Every section inspector follows one visual language: frosted glass `EditorCard` shell with sticky icon+title header, consistent padding (`p-5 space-y-5`), and optional `headerActions` for Reset/Preview buttons. No more page-level headings, no more naked field lists.

