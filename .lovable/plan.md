

## Restyle "Mark Configured" → "Finalize Configuration" Button

### Changes

**Both footer instances** (tracked ~line 820–837, untracked ~line 900–917) and the toast message (~line 214):

| State | Current | New |
|-------|---------|-----|
| **Not configured** (button) | `variant="default"`, CheckCircle2 icon, "Mark Configured" | `variant="ghost"` with amber text (`text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20`), no icon, label **"Finalize Configuration"** |
| **Configured** (status) | `text-primary` CheckCircle2 + "Configured" | `text-green-600 dark:text-green-400` CheckCircle2 + "Configured" (green ghost style) |
| **Toast message** | "click 'Mark Configured'" | "click 'Finalize Configuration'" |

### Technical Detail

**File: `ServiceTrackingSection.tsx`**

1. **Lines 825–836** — Replace default button with amber ghost:
   - Remove `<CheckCircle2>` icon
   - Change `variant="default"` → `variant="ghost"`
   - Add className: `text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20`
   - Label: "Finalize Configuration"

2. **Lines 806–808** — Update configured state styling:
   - Change CheckCircle2 from `text-primary` → `text-green-600 dark:text-green-400`
   - Keep "Configured" label and check icon

3. **Lines 905–916** — Same changes as #1 for the untracked footer

4. **Lines 886–888** — Same green styling as #2 for the untracked "Reviewed" state

5. **Line 214** — Update toast text to reference "Finalize Configuration"

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx`

