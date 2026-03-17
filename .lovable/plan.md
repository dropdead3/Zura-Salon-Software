

# Add Sidebar Preview Panel to Business Settings Dialog

## What
Add a live sidebar preview panel below the Brand Logos section that shows admins exactly how their logo/icon will render in both expanded and collapsed sidebar states, updating in real-time as they upload or remove logos.

## Layout
After the logo upload cards (line ~540) and before the Secondary Icons section, insert a preview panel:

```text
┌─────────────────────────────────────────────┐
│  📐 Sidebar Preview                         │
│                                              │
│  ┌──────────────────────┐  ┌──────────┐     │
│  │  EXPANDED             │  │ COLLAPSED│     │
│  │  ┌─────────────────┐ │  │ ┌──────┐ │     │
│  │  │ [logo image]    │ │  │ │ icon │ │     │
│  │  │ h-7 max-w-160   │ │  │ │ or   │ │     │
│  │  └─────────────────┘ │  │ │ 2-chr│ │     │
│  │  ─── nav items ───   │  │ └──────┘ │     │
│  └──────────────────────┘  └──────────┘     │
│                                              │
│  Light ○ / Dark ○  (toggle to preview both) │
└─────────────────────────────────────────────┘
```

## Implementation

### 1. Add a `SidebarLogoPreview` inline component inside `BusinessSettingsDialog.tsx`
- Takes `formData` (logo URLs, icon URLs, business_name) as props
- Has a local `previewTheme` toggle (light/dark) to show both variants
- Renders two mini previews side-by-side:
  - **Expanded**: mimics sidebar header — logo at `h-7 max-w-[160px]`, or business name text fallback
  - **Collapsed**: icon at `h-6 max-w-[32px]`, or 2-letter circle fallback
- Uses the same conditional logic as `SidebarNavContent.tsx` lines 339-365 (custom logo vs text fallback)
- Styled with `bg-sidebar` and `border` to look like a real sidebar snippet
- Includes 2-3 fake nav item placeholder bars below the logo for context

### 2. Insert the preview between logos and icons sections
- Place it after line 540 (end of logo grid), before Secondary Icons
- Only render when at least one logo or icon is uploaded (otherwise it's just showing fallback text, not very useful)

### Files modified
- `src/components/dashboard/settings/BusinessSettingsDialog.tsx` — add preview component + render it

