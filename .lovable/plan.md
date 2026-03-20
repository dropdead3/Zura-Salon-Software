

## Remove Emojis from Service Step, Match Scheduling Wizard Style

### Problem
The Dock's service step uses emoji icons for category cards (✨🎨✂️💇‍♀️ etc.) which violates the design system rules. The category grid layout also diverges from the dashboard scheduling wizard's flat-list-with-headers approach.

### Changes in `src/components/dock/schedule/DockNewBookingSheet.tsx`

**1. Replace `getCategoryIcon` — swap emojis for Lucide icons**
Replace the emoji-returning function with one that returns Lucide icon components mapped to category keywords (Sparkles for Blonding, Palette for Color, Scissors for Haircuts, etc.). Falls back to `Scissors` for unknown categories.

**2. Restructure the category grid to use Lucide icons**
In the category card, replace `<span className="text-xl">{getCategoryIcon(cat)}</span>` with a properly styled icon container (`w-8 h-8 rounded-lg bg-violet-600/10`) rendering the Lucide component at `w-4 h-4 text-violet-400`. Same change in the Level 2 header.

**3. Keep the 2-column grid layout**
The grid is a good mobile pattern — the screenshot reference confirms this. Only the emoji rendering changes; the card structure, selection badge, service count, and drill-down animation all stay.

### Mapping

| Category pattern | Lucide Icon |
|---|---|
| blond/highlight/balayage | `Sparkles` |
| color | `Palette` |
| cut/haircut | `Scissors` |
| extension | `Link` |
| style/blowout | `Wind` |
| extra/treatment | `Droplets` |
| consult | `ClipboardList` |
| vivid | `Paintbrush` |
| fallback | `Scissors` |

