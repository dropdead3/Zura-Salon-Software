

## Replace Client Initial Avatars with RC/NC Badges in Day View

### Change
In the day view appointment cards, replace the round client-initials avatar (e.g. "PE", "MM") with a badge indicating **NC** (New Client) or **RC** (Returning Client), using the existing `is_new_client` flag on the appointment.

### Implementation
**1 file**: `src/components/dashboard/schedule/AppointmentCardContent.tsx` — lines 277-281

Replace the current avatar circle that shows `getClientInitials()` with a styled badge:

- **NC** (New Client): amber tint — `bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300`
- **RC** (Returning Client): emerald tint — `bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`

The badge keeps the same `h-5 w-5 rounded-full` dimensions and `text-[8px]` sizing so it fits the existing layout without shifting anything.

```tsx
// Before (lines 278-280):
<span className={cn('h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0', getAvatarColor(appointment.client_name))}>
  {getClientInitials(appointment.client_name)}
</span>

// After:
<span className={cn(
  'h-5 w-5 rounded-full flex items-center justify-center text-[8px] font-medium shrink-0',
  appointment.is_new_client
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
)}>
  {appointment.is_new_client ? 'NC' : 'RC'}
</span>
```

This is a day-view-only change — the weekly view branch (`showStylistBadge=true`) already hides the client avatar via `showClientAvatar=false`.

### Scope
- Single file, single code block edit
- No backend changes
- Uses existing `is_new_client` boolean from the appointment data

