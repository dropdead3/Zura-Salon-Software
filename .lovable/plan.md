

## Refactor Inspector Panel — Promote Section Styling, Remove Card-in-Card

### What I Found

The inspector currently has a **card-within-card** problem. Here's the nesting chain:

```text
InspectorPanel (glass bento panel — bg-card/80, border, rounded-xl)
  └─ ScrollArea
       └─ PanelSlideIn (animation wrapper)
            └─ div.space-y-4
                 ├─ EditorCard (SECOND card — bg-card/80, border, rounded-xl, sticky header)
                 │    └─ Content fields (inputs, toggles, etc.)
                 └─ SectionStyleEditor (THIRD card — border rounded-lg collapsible)
```

Three nested containers. The `EditorCard` inside the inspector is redundant — the inspector panel itself already provides the glass bento container, header, and scrolling. And `SectionStyleEditor` sits at the very bottom, after all content fields, buried beneath CTAs and advanced settings.

### Architecture of the Fix

**Zone A — Section-Level Controls** (top of inspector, directly under breadcrumb header):
- `SectionStyleEditor` (collapsible, default collapsed, borderless)
- Subtle divider

**Zone B — Content Controls** (everything below):
- Editor fields directly rendered (no `EditorCard` wrapper)

### Files to Change

| File | Change |
|---|---|
| `WebsiteSectionsHub.tsx` | Restructure `renderEditor()` to render `SectionStyleEditor` first (Zone A), then a divider, then the editor component (Zone B). |
| `HeroEditor.tsx` | Remove `EditorCard` wrapper. Return fields directly. Move reset button to a prop/callback system or keep inline without card chrome. |
| `SectionDisplayEditor.tsx` | Remove `EditorCard` wrapper. Return fields directly in a `space-y-5` div. |
| `CustomSectionEditor.tsx` | Remove `EditorCard` wrapper. Return fields directly. Remove its own `SectionStyleEditor` (now handled by parent). |
| `SectionStyleEditor.tsx` | Remove `border rounded-lg` container styling. Use borderless collapsible with subtle group-header typography matching `editorTokens.inspector.groupHeader`. |

### Detailed Changes

#### 1. `WebsiteSectionsHub.tsx` — `renderEditor()` (lines 584-609)

Current:
```tsx
const renderEditor = () => {
  // ...
  return (
    <div className="space-y-4">
      <EditorComponent />  {/* ← contains EditorCard */}
      {section && <SectionStyleEditor ... />}  {/* ← at bottom */}
    </div>
  );
};
```

New:
```tsx
const renderEditor = () => {
  // ...
  const sectionId = TAB_TO_SECTION[activeTab];
  const section = sectionId ? sectionsConfig?.homepage.find(s => s.id === sectionId) : null;

  return (
    <div className="space-y-0">
      {/* Zone A: Section-level controls */}
      {section && (
        <SectionStyleEditor
          value={section.style_overrides ?? {}}
          onChange={(overrides) => handleStyleOverrideChange(section.id, overrides)}
          sectionId={section.id}
        />
      )}

      {/* Divider between zones */}
      {section && (
        <div className="mx-1 my-1 border-t border-border/20" />
      )}

      {/* Zone B: Content controls */}
      <EditorComponent />
    </div>
  );
};
```

Same pattern applied to the `custom-` branch: move `SectionStyleEditor` above `renderFields()`.

#### 2. `HeroEditor.tsx`

Remove `EditorCard` wrapper entirely. The component currently returns:
```tsx
<div className="space-y-6 h-full">
  <EditorCard title="Hero Section" icon={Sparkles} headerActions={resetButton}>
    {/* all fields */}
  </EditorCard>
</div>
```

Replace with:
```tsx
<div className="space-y-5">
  {/* all fields directly — no EditorCard */}
</div>
```

The reset button moves to a small inline row at the top (or stays as a ghost button within the field flow). The title/icon are redundant because the `InspectorPanel` breadcrumb already shows "Home → Hero Section".

#### 3. `SectionDisplayEditor.tsx`

Same pattern — remove `EditorCard` wrapper. Return fields in a flat `space-y-5` div. The `title` and `description` props become unused (already displayed in the inspector breadcrumb). Keep the loading spinner as-is.

#### 4. `CustomSectionEditor.tsx`

Remove `EditorCard` wrapper. Remove the `SectionStyleEditor` render at the bottom (lines 303-309) — this is now handled by `renderEditor()` in the parent. Keep the label-editing input as a standalone row at the top of the fields.

#### 5. `SectionStyleEditor.tsx`

Current styling: `border rounded-lg` on the Collapsible root, full-width ghost Button trigger.

New styling:
- Remove `border rounded-lg` from the Collapsible container
- Style the trigger to match `editorTokens.inspector.groupHeader` (uppercase tracking, subtle border-t)
- Keep `CollapsibleContent` padding as-is but remove boxing
- This makes it feel like a native inspector group, not a separate card

### Visual Result

```text
┌─────────────────────────────┐
│ Home → Hero Section     [▸] │  ← breadcrumb header (existing)
├─────────────────────────────┤
│                             │
│ SECTION STYLING      [▸]   │  ← Zone A: collapsible, collapsed by default
│   (Background, Padding,    │     expands inline, no card border
│    Max Width, Radius)       │
│                             │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │  ← subtle divider (border-border/20)
│                             │
│ Show Eyebrow        [    ] │  ← Zone B: content fields, flat
│ Eyebrow Text    [________] │
│ Show Rotating   [    ]     │
│ Rotating Words  [________] │
│ Show Subheadline [    ]    │
│                             │
│ ─ Call to Action ────────── │
│ Primary Button  [________] │
│ Primary URL     [________] │
│                             │
│ ⚙ Advanced Settings  Show  │
│                             │
└─────────────────────────────┘
```

No card-within-card. Section Styling is immediately discoverable at the top. Content fields flow naturally with typographic hierarchy and spacing as structure.

### Scope

- 5 files modified
- No public site changes
- No database changes
- No canvas or theme changes
- Strictly editor inspector panel UX

