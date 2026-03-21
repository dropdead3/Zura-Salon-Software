

## Match Admin PIN Pad to Front Entry PIN Pad

**File:** `src/components/dock/settings/DockTeamCompliancePanel.tsx`

The admin PIN pad (Team Compliance gate) uses smaller buttons and wider gaps than the front entry PIN pad (`DockPinGate`). Align them:

| Property | Admin (current) | Front entry | Target |
|----------|----------------|-------------|--------|
| Grid gap | `gap-3` | `gap-2` | `gap-2` |
| Grid width | `w-64` | `w-80` | `w-80` |
| Button height | `h-14` | `h-[72px]` | `h-[72px]` |
| Text size | `text-lg` | `text-2xl` | `text-2xl` |
| Delete button | `Delete` icon | "Clear" text | "Clear" text (clears full PIN) |
| PIN dots | `w-3.5 h-3.5` | `w-4 h-4` | `w-4 h-4` |
| Dots margin | `mb-8` | `mb-6` | `mb-6` |

**Changes (lines 113–148):**

1. **Line 113** — PIN dots: `gap-4 mb-8` → `gap-3 mb-6`, dot size `w-3.5 h-3.5` → `w-4 h-4`
2. **Line 130** — Grid: `gap-3 w-64` → `gap-2 w-80`
3. **Line 136** — Delete button: height `h-14` → `h-[72px]`, replace `Delete` icon with `"Clear"` text label
4. **Line 137** — Remove `Delete` icon import (replace with text)
5. **Line 142-143** — Digit buttons: `h-14` → `h-[72px]`, `text-lg` → `text-2xl`
6. **Delete handler** — Change from single-character delete to full clear (`setPin('')`)

All changes in one file.

