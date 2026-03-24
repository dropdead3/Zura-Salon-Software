

## Enlarge Notes, Summary & Client Tabs + Add Dock Content Sizing Tokens

### Problem
The Services tab was enlarged earlier (text-sm body, text-sm headers, bigger cards), but Notes, Summary, and Client tabs still use the old smaller sizing (text-xs body, text-[10px] labels, w-4 icons, small padding). This creates inconsistency across tabs.

### Solution
Add a `DOCK_CONTENT` token group to `dock-ui-tokens.ts` for reusable content sizing, then apply it across all three tabs.

### 1. New tokens — `src/components/dock/dock-ui-tokens.ts`

```ts
export const DOCK_CONTENT = {
  /** Section headers (e.g. "Booking Note", "Team Notes") */
  sectionHeader: 'text-sm font-display uppercase tracking-wider text-[hsl(var(--platform-foreground-muted))]',
  /** Body text in cards */
  body: 'text-sm text-[hsl(var(--platform-foreground))]',
  bodyMuted: 'text-sm text-[hsl(var(--platform-foreground-muted))]',
  /** Small supporting text (dates, counts, staff names) */
  caption: 'text-xs text-[hsl(var(--platform-foreground-muted))]',
  captionDim: 'text-xs text-[hsl(var(--platform-foreground-muted)/0.5)]',
  /** Section icons */
  sectionIcon: 'w-4.5 h-4.5',
  /** Card padding */
  cardPadding: 'px-4 py-3.5',
  /** Input fields */
  input: 'h-12 px-4 text-sm rounded-xl',
  /** Avatars in thread */
  avatar: 'w-8 h-8',
  avatarFallback: 'text-[10px]',
  /** Card icon containers */
  iconBox: 'w-5 h-5',
} as const;
```

### 2. `DockNotesTab.tsx` — Size up everything

| Element | Current | New |
|---------|---------|-----|
| Section headers (DOCK_TEXT.category) | `text-xs` | `DOCK_CONTENT.sectionHeader` (`text-sm`) |
| Card padding | `px-3 py-2.5` | `px-4 py-3.5` |
| Card icons (CalendarPlus, FileText) | `w-4 h-4` | `w-5 h-5` |
| Body text in cards | `text-xs` | `text-sm` |
| Show more button | `text-[10px]` | `text-xs` |
| Team note input | `h-10 px-3 text-sm` | `h-12 px-4 text-sm` |
| Send button | `w-10 h-10` | `w-12 h-12` |
| Send icon | `w-4 h-4` | `w-5 h-5` |
| Avatar | `w-6 h-6` | `w-8 h-8` |
| Avatar fallback | `text-[9px]` | `text-[10px]` |
| Author name | `text-[11px]` | `text-sm` |
| Timestamp | `text-[10px]` | `text-xs` |
| Note body | `text-xs` | `text-sm` |
| Delete icon | `w-3.5 h-3.5` | `w-4 h-4` |
| Empty state icon | `w-8 h-8` | `w-10 h-10` |
| Empty state text | `text-xs` | `text-sm` |

### 3. `DockSummaryTab.tsx` — Size up everything

| Element | Current | New |
|---------|---------|-----|
| Appointment info card padding | `p-4` | `p-5` |
| InfoRow labels & values | `text-xs` | `text-sm` |
| Bowl stat icons | `w-4 h-4` | `w-5 h-5` |
| Bowl stat numbers | `text-lg` | `text-xl` |
| Bowl stat labels | `text-[10px]` | `text-xs` |
| Bowl stat card padding | `p-3` | `p-4` |
| Session Totals header | `text-xs` | `text-sm` |
| Session totals card padding | `p-4` | `p-5` |
| StatTile padding | `p-2.5` | `p-3.5` |
| StatTile icon | `w-3 h-3` | `w-4 h-4` |
| StatTile label | `text-[10px]` | `text-xs` |
| StatTile value | `text-sm` | `text-base` |
| Waste % label | `text-[10px]` | `text-xs` |
| Waste % value | `text-xs` | `text-sm` |
| Empty state icon | `w-10 h-10` → keep |
| Empty state text | `text-sm` → keep |

### 4. `DockClientTab.tsx` — Size up everything

| Element | Current | New |
|---------|---------|-----|
| Medical alert label | `text-[10px]` | `text-xs` |
| Alert body | `text-xs` | `text-sm` |
| Alert icon | `w-4 h-4` | `w-5 h-5` |
| Alert edit confirm/cancel icons | `w-3.5 h-3.5` | `w-4 h-4` |
| Alert textarea | `text-xs` | `text-sm` |
| "Add Medical Alert" text | `text-xs` | `text-sm` |
| Identity avatar | `w-12 h-12` | `w-14 h-14` |
| Identity initials | `text-sm` | `text-base` |
| Identity name | `text-sm` | `text-base` |
| Identity phone/email | `text-xs` | `text-sm` |
| Different stylist warning | `text-[10px]` | `text-xs` |
| Section header icons | `w-3.5 h-3.5` | `w-4 h-4` |
| Section header text | `text-xs` | `text-sm` |
| Section header service label | `text-[10px]` | `text-xs` |
| Last Formula lines | `text-xs` | `text-sm` |
| Last Formula weight | `text-xs` | `text-sm` |
| Ratio text | `text-[10px]` | `text-xs` |
| Source/date text | `text-[10px]` | `text-xs` |
| Formula history card | `px-3 py-2.5` | `px-4 py-3.5` |
| Formula service name | `text-xs` | `text-sm` |
| Formula date | `text-[10px]` | `text-xs` |
| Formula ingredient lines | `text-[10px]` | `text-xs` |
| Staff attribution | `text-[9px]` | `text-[10px]` |
| Show all button | `text-[10px]` | `text-xs` |
| Processing time body | `text-xs` | `text-sm` |
| Processing time card | `px-3 py-2.5` | `px-4 py-3.5` |
| Favorite products text | `text-xs` | `text-sm` |
| Favorite products count | `text-[10px]` | `text-xs` |
| Restock badge | `text-[9px]` | `text-[10px]` |
| Cross-sell product | `text-xs` | `text-sm` |
| Cross-sell buyer count | `text-[10px]` | `text-xs` |
| Cross-sell card padding | `px-3 py-2.5` | `px-4 py-3.5` |
| Photo thumbnails | `w-16 h-16` | `w-20 h-20` |
| Photo date | `text-[9px]` | `text-[10px]` |
| Profile notes body | `text-sm` → keep |
| Profile notes card | `p-3` | `p-4` |
| Visit history service name | `text-xs` | `text-sm` |
| Visit history date/stylist | `text-[10px]` | `text-xs` |
| Visit status | `text-[9px]` | `text-[10px]` |
| Visit card padding | `px-3 py-2.5` | `px-4 py-3.5` |

### Files changed
1. `src/components/dock/dock-ui-tokens.ts` — add `DOCK_CONTENT`
2. `src/components/dock/appointment/DockNotesTab.tsx`
3. `src/components/dock/appointment/DockSummaryTab.tsx`
4. `src/components/dock/appointment/DockClientTab.tsx`

