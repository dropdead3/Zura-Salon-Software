

## Enlarge All Dock Elements for Fast-Paced Work Environment

**Problem:** Current text sizes (text-sm, text-base, text-[11px]) and icon sizes are too small for a station display used in a fast-paced salon environment.

### Changes

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

1. **Header title** (line 137): `text-2xl` → `text-3xl`
2. **Date subtitle** (line 140): `text-sm` → `text-base`
3. **Toggle label** (line 154): `text-sm` → `text-base`
4. **Status group labels** (line 240): `text-sm` → `text-base`, dot `w-2.5 h-2.5` → `w-3 h-3`
5. **Status count** (line 243): `text-sm` → `text-base`
6. **Empty state text** (line 171): `text-sm` → `text-base`
7. **Card spacing** (line 247): `space-y-3` → `space-y-4`

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

8. **Client name + service** (line 157): `text-base` → `text-lg`
9. **Time/duration text** (line 169): `text-sm` → `text-base`
10. **Assistant text** (line 175): `text-sm` → `text-base`, icon `w-3.5 h-3.5` → `w-4 h-4`
11. **Card padding** (line 155): `p-5` → `p-6`
12. **Mix session icon** (line 149-151): `w-8 h-8` → `w-9 h-9`, inner icon `w-4 h-4` → `w-5 h-5`

**File: `src/components/dock/DockBottomNav.tsx`**

13. **Nav icons** (line 73): `h-6 w-6` → `h-7 w-7`
14. **Nav labels** (line 91): `text-[11px]` → `text-xs`
15. **Nav button height** (line 49): `h-16` → `h-[72px]`

**File: `src/components/dock/schedule/DockScheduleTab.tsx`** (new booking button)

16. **Plus button** (line 146): `w-12 h-12` → `w-14 h-14`, icon `w-6 h-6` → `w-7 h-7`

All changes are class-level size bumps — no layout or logic changes.

