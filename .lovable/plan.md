

## Enlarge Components & Text on Appointment Detail + Services Tab

Increase sizing across the appointment detail header, tab bar, alert banners, service headers, and bowl cards. Excludes badges and bottom FABs (contextual action bar, formula history button).

### Changes

**1. `src/components/dock/appointment/DockAppointmentDetail.tsx`**

| Element | Current | New |
|---------|---------|-----|
| Back button | `w-9 h-9`, icon `w-4 h-4` | `w-11 h-11`, icon `w-5 h-5` |
| Client name | `text-base` | `text-xl` |
| Service/time subtitle | `text-xs` | `text-sm` |
| Pencil icon | `w-3 h-3` | `w-3.5 h-3.5` |
| Tab bar container | `p-1.5` | `p-2` |
| Tab buttons | `h-10`, `text-xs`, icon `w-3.5 h-3.5` | `h-12`, `text-sm`, icon `w-4 h-4` |
| Tab bar radius | `rounded-2xl` / `rounded-xl` | keep |

**2. `src/components/dock/appointment/DockClientAlertsBanner.tsx`**

| Element | Current | New |
|---------|---------|-----|
| Alert icons | `w-4 h-4` | `w-5 h-5` |
| Category title | `text-xs` (via DOCK_TEXT.category) | add `text-sm` override |
| Body text | `text-xs` | `text-sm` |
| Card padding | `px-3 py-2.5` | `px-4 py-3.5` |
| X button icon | `w-3.5 h-3.5` | `w-4 h-4` |

**3. `src/components/dock/appointment/DockServicesTab.tsx`**

| Element | Current | New |
|---------|---------|-----|
| Service header | `text-xs` | `text-sm` |
| Bowl count label | `text-[10px]` | `text-xs` |
| **AddBowlCard** | `min-h-[140px]`, icon container `w-10 h-10`, icon `w-5 h-5`, label `text-xs` | `min-h-[160px]`, `w-12 h-12`, `w-6 h-6`, `text-sm` |
| **BowlCard** | `min-h-[140px]`, `p-4`, icon box `w-9 h-9`, title `text-xs`, status `text-[11px]` | `min-h-[160px]`, `p-5`, `w-10 h-10`, title `text-sm`, status `text-xs` |
| **DemoBowlCard** | same as BowlCard + ingredient lines `text-[11px]`, footer `text-[10px]` | same scaling + `text-xs`, footer `text-[11px]` |
| Grid gap | `gap-3` | `gap-4` |
| Section spacing | `space-y-5` | `space-y-6` |

No changes to ContextualActionBar or formula history FAB button.

### Files changed
- `src/components/dock/appointment/DockAppointmentDetail.tsx`
- `src/components/dock/appointment/DockClientAlertsBanner.tsx`
- `src/components/dock/appointment/DockServicesTab.tsx`

