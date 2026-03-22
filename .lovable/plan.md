

## Enlarge Dock Schedule UI — Bigger Text, Cards, and Navigation

The current Dock schedule uses very small text sizes (text-xs, text-[11px], text-sm) and compact padding that's hard to read on a station display. This plan scales up all key elements.

### Changes

**1. `src/components/dock/schedule/DockScheduleTab.tsx` — Page Header & Group Labels**

| Element | Current | New |
|---------|---------|-----|
| "Schedule" heading | `text-lg` | `text-2xl` |
| Date subtitle | `text-xs` | `text-sm` |
| Plus button | `w-10 h-10`, icon `w-5 h-5` | `w-12 h-12`, icon `w-6 h-6` |
| Group label (Active/Scheduled) | `text-xs` | `text-sm` |
| Group count | `text-xs` | `text-sm` |
| Group dot | `w-2 h-2` | `w-2.5 h-2.5` |
| Card spacing | `space-y-2` | `space-y-3` |
| Group spacing | `space-y-6` | `space-y-8` |
| Section padding | `px-5 pt-6 pb-4` | `px-5 pt-8 pb-5` |
| Group header margin | `mb-3` | `mb-4` |

**2. `src/components/dock/schedule/DockAppointmentCard.tsx` — Card Content**

| Element | Current | New |
|---------|---------|-----|
| Client name | `text-sm` | `text-base` |
| Service name | `text-xs` | `text-sm` |
| Stylist name | `text-[11px]` | `text-sm` |
| Assistant names | `text-[11px]` | `text-sm` |
| Time display | `text-[11px]` | `text-sm` |
| Icons (User, Users, Clock) | `w-3 h-3` | `w-4 h-4` |
| Card padding | `p-4` | `p-5` |
| Mix icon container | `w-7 h-7` | `w-8 h-8` |
| Mix icon | `w-3.5 h-3.5` | `w-4 h-4` |
| Finish button text | `text-[9px]` | `text-[11px]` |
| Finish button icon | `w-5 h-5` | `w-6 h-6` |
| Time margin-top | `mt-1.5` | `mt-2` |
| Stylist margin-top | `mt-1` | `mt-1.5` |

**3. `src/components/dock/DockBottomNav.tsx` — Bottom Navigation**

| Element | Current | New |
|---------|---------|-----|
| Nav height | `h-14` per button | `h-16` |
| Icon size | `h-5 w-5` | `h-6 w-6` |
| Label text | `text-[9px]` | `text-[11px]` |
| Nav padding | `py-2` | `py-2.5` |
| Bottom bar padding | `pb-3` | `pb-4` |

All changes are class-level adjustments across 3 files — no logic changes.

