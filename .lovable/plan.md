

## Enhance Website Editor UI with Luxury Glass Aesthetic

Good instinct -- the screenshot shows the sidebar and editor panel using flat, plain backgrounds that feel disconnected from the rest of the dashboard's premium aesthetic. This plan upgrades every surface of the website editor to match the luxury glass bento style.

### Changes Overview

**1. Create `EditorCard` component** (New file)
`src/components/dashboard/website-editor/EditorCard.tsx`

A reusable luxury wrapper replacing raw `<Card>` in all editor components:
- Glass aesthetic: `bg-card/80 backdrop-blur-xl border-border/40 rounded-xl shadow-sm`
- Sticky frosted-glass header: `bg-card/90 backdrop-blur-md border-b border-border/30`
- Icon box slot following canonical card header pattern (icon + Termina title)
- Slots for `headerActions` (Reset buttons, etc.)
- Consistent `p-6 space-y-6` content padding

```tsx
interface EditorCardProps {
  title: string;
  icon?: LucideIcon;
  description?: string;
  headerActions?: ReactNode;
  children: ReactNode;
}
```

**2. Sidebar glass styling**
`src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx`

- Expanded sidebar: Change `bg-background border-r` to `bg-card/60 backdrop-blur-xl border-r border-border/40`
- Collapsed sidebar: Same glass treatment
- Stats footer already uses `bg-muted/30` -- keep as-is

**3. Editor container + toolbar glass**
`src/pages/dashboard/admin/WebsiteSectionsHub.tsx`

- Editor content area (line 865): Add `bg-muted/30` background so glass cards float
- Toolbar (line 812): Change `bg-background` to `bg-card/80 backdrop-blur-md`

**4. Migrate all ~18 editor components to `EditorCard`**

Each follows the same pattern -- replace `<Card>/<CardHeader>/<CardContent>` with `<EditorCard>`:

```tsx
// Before
<Card className="overflow-auto">
  <CardHeader className="flex flex-row items-center justify-between pb-4 sticky top-0 bg-card z-10 border-b">
    <CardTitle className="text-lg">Hero Section</CardTitle>
    <Button ...>Reset</Button>
  </CardHeader>
  <CardContent className="space-y-6 pt-6">
    ...fields...
  </CardContent>
</Card>

// After
<EditorCard title="Hero Section" icon={Sparkles} headerActions={<Button ...>Reset</Button>}>
  ...fields...
</EditorCard>
```

Files affected:
- `HeroEditor.tsx`
- `BrandStatementEditor.tsx`
- `NewClientEditor.tsx`
- `TestimonialsEditor.tsx`
- `ExtensionsEditor.tsx`
- `FAQEditor.tsx`
- `BrandsManager.tsx`
- `DrinksManager.tsx`
- `FooterCTAEditor.tsx`
- `FooterEditor.tsx`
- `ServicesPreviewEditor.tsx`
- `PopularServicesEditor.tsx`
- `GalleryDisplayEditor.tsx`
- `StylistsDisplayEditor.tsx`
- `LocationsDisplayEditor.tsx`
- `CustomSectionEditor.tsx`
- `SectionDisplayEditor.tsx` (generic)
- `AnnouncementBarContent.tsx`
- `LinkToManagerCard.tsx`

**5. `SectionGroupHeader` enhancement**
Add a subtle bottom divider line with muted opacity for cleaner visual separation between section groups in the sidebar.

### Technical Notes
- `EditorCard` is purely presentational -- no logic changes to save/dirty/undo-redo
- Font rules enforced: card titles use `font-display text-base tracking-wide` (Termina), max weight `font-medium`
- Glass blur stacks correctly since each card uses independent `backdrop-blur-xl`
- Sticky header behavior preserved within the scroll container

### Files Changed
- `src/components/dashboard/website-editor/EditorCard.tsx` -- NEW
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` -- toolbar + container glass
- `src/components/dashboard/website-editor/WebsiteEditorSidebar.tsx` -- sidebar glass
- `src/components/dashboard/website-editor/SectionGroupHeader.tsx` -- subtle divider
- All ~18 editor components listed above -- migrate to `EditorCard`

