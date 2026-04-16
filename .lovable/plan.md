

# Responsive Condensed Stylist Headers

## Problem
From the screenshot, when columns are narrow the name characters break awkwardly mid-word and "Studio..." truncates poorly. At very condensed widths, the layout needs to switch to a vertically stacked, centered design.

## Changes — `src/components/dashboard/schedule/DayView.tsx`

### 1. Switch layout to vertical stack (centered)
Change the header cell from `flex items-center gap-2` (horizontal) to `flex flex-col items-center text-center gap-1` so the avatar sits centered above the text.

### 2. Format name as "First L." when condensed
Add a helper that extracts the first name and last initial from the full name:
```text
"Sarah Spencer" → "Sarah S."
"Gavin Eagan"   → "Gavin E."
```
Use this condensed format in the header cell instead of the full display name.

### 3. Center all elements vertically
```text
┌─────────────┐
│      ●      │  ← status dot (top-right, stays absolute)
│    [Ava]    │  ← avatar centered
│  Sarah S.   │  ← first name + last initial
│    75%      │  ← utilization
│   Stud...   │  ← level (truncated)
└─────────────┘
```

### Implementation Detail

**Line ~516**: Change the cell class from horizontal flex to vertical centered flex:
```tsx
className="relative flex-1 min-w-0 bg-[hsl(var(--sidebar-background))]/95 text-[hsl(var(--sidebar-foreground))] p-2 flex flex-col items-center text-center gap-1 border-r border-[hsl(var(--sidebar-border))] last:border-r-0"
```

**Line ~547-557**: Remove the wrapping `div` with `flex flex-col min-w-0`, flatten the name/pct/level as direct children, all centered.

**Line ~548-549**: Add a condensed name formatter:
```tsx
function formatCondensedName(fullName: string, displayName?: string | null): string {
  const name = formatDisplayName(fullName, displayName);
  const parts = name.trim().split(' ');
  if (parts.length <= 1) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}
```
Use `formatCondensedName(stylist.full_name, stylist.display_name)` in the header.

Single file change, no new dependencies.

