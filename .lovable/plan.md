

# Appointment Card UI/UX Overhaul

## Current State Analysis

The appointment card rendering logic is **duplicated across three files** (DayView ~170 lines, WeekView ~120 lines, AgendaView ~130 lines) with inconsistent prop interfaces, different visual treatments, and divergent information hierarchies. This creates maintenance friction and visual inconsistency.

### Key Issues Identified

1. **No shared component** -- Each view has its own inline `AppointmentCard` function with copy-pasted logic for avatars, badges, service formatting, status colors, overlays, and dark mode styles
2. **Inconsistent information density** -- DayView shows phone numbers inline with client name; WeekView shows them only on medium+ cards; AgendaView shows them as tappable links below
3. **Badge clutter on small cards** -- Compact cards (under 30min) try to fit redo, recurring, rescheduled, assistant, overdue, and new-client indicators into a single row
4. **No hover preview** -- Clicking is the only way to see appointment details; there's no lightweight hover tooltip for quick scanning
5. **Weak selection feedback** -- Selected card has no visual ring or highlight (comment in code says "handled by detail panel")
6. **Status visibility** -- WeekView uses a tiny 2px pip at bottom-right for confirmed/checked-in; DayView uses pill badges; these should be unified

## Plan

### Phase 1: Extract Shared `AppointmentCardContent` Component

Create a single shared component that all three views render inside their positioning wrappers.

**New file: `src/components/dashboard/schedule/AppointmentCardContent.tsx`**

This component accepts a `variant` prop (`'grid' | 'agenda'`) and a `size` prop (`'compact' | 'medium' | 'full'`) computed from duration:
- **compact**: duration less than or equal to 30min -- single line: client name + 1-2 priority icons
- **medium**: 31-59min -- client name, service name, time range
- **full**: 60min+ -- client name, service breakdown, time range, price, assistants, rescheduled-from

Shared logic extracted:
- Avatar initials + deterministic color (`getClientInitials`, `getAvatarColor`)
- Status badge rendering (using `APPOINTMENT_STATUS_BADGE` tokens)
- Service formatting (`formatServicesWithDuration`, `sortServices`)
- Multi-service color banding
- Dark mode category style computation
- Gradient/consultation overlays
- Block/Break X-pattern overlay
- Indicator icon cluster (redo, recurring, rescheduled, assistant, new client, overdue)

### Phase 2: Unified Indicator Priority System

Instead of showing all indicators at once, implement a **priority queue** that caps visible indicators based on card size:

| Card Size | Max Indicators | Priority Order |
|---|---|---|
| compact | 2 | overdue > new client > redo > rescheduled > recurring > assistant |
| medium | 4 | status badge + overdue > new client > redo > rescheduled > recurring > assistant |
| full | all | Show all with status badge |

Overflow indicators collapse into a `+N` counter with a tooltip listing the hidden ones.

### Phase 3: Selection Ring + Hover Preview

**Selection ring**: When `isSelected` is true, apply a `ring-2 ring-primary/60 ring-offset-1` to the card container. This gives immediate visual feedback that the card is active, independent of the detail panel.

**Hover tooltip (grid variants only)**: On hover after 400ms delay, show a lightweight `TooltipContent` with:
- Client name + phone
- Service list with durations
- Status + stylist name
- Total price

This enables quick scanning without clicking, especially useful in dense DayView columns.

### Phase 4: Consistent Status Indicators

Replace the inconsistent status treatments across views with a single unified approach:

- **Grid cards (Day/Week)**: A colored **left accent bar** (already exists via `border-l-4`) combined with a subtle **status dot** at top-left of the card (3px circle using status color). Remove the WeekView bottom-right pip.
- **Agenda cards**: Keep the vertical status bar divider + the existing badge in the right column (this pattern works well for the list layout).
- **Full-size grid cards** (60min+): Add the pill badge in the top-right cluster (current DayView behavior), standardized to use `APPOINTMENT_STATUS_BADGE` tokens.

### Phase 5: View-Specific Wrappers

Each view keeps a thin wrapper that handles positioning:

- **DayView wrapper**: Absolute positioning, drag-and-drop via `useDraggable`, column overlap calculation, selection state. Renders `AppointmentCardContent variant="grid"`.
- **WeekView wrapper**: Absolute positioning (simpler, no drag). Renders `AppointmentCardContent variant="grid"`.
- **AgendaView wrapper**: Card-based layout with time column and chevron. Renders `AppointmentCardContent variant="agenda"`.

### Phase 6: Visual Polish

- **Rounded corners**: Upgrade from `rounded-md` to `rounded-lg` on grid cards for softer appearance consistent with the bento aesthetic
- **Hover state**: Replace `hover:brightness-110` with a more controlled `hover:shadow-md` + subtle scale `hover:scale-[1.01]` (reduce from current 1.02 in WeekView)
- **Compact card padding**: Increase from `px-1.5 py-0.5` to `px-2 py-1` for breathing room
- **Client avatar**: Show on medium+ cards in grid view (currently only WeekView shows it); use consistent `h-5 w-5` size
- **Typography**: Ensure client name always uses `font-medium` (never bold), service names use regular weight at reduced opacity

## Technical Details

### New File Structure

| File | Action |
|---|---|
| `src/components/dashboard/schedule/AppointmentCardContent.tsx` | **New** -- Shared card rendering component (~200 lines) |
| `src/components/dashboard/schedule/appointment-card-indicators.tsx` | **New** -- Priority-based indicator rendering utility (~60 lines) |
| `src/components/dashboard/schedule/DayView.tsx` | **Modify** -- Replace inline card with wrapper + `AppointmentCardContent` (remove ~150 lines, add ~30) |
| `src/components/dashboard/schedule/WeekView.tsx` | **Modify** -- Replace inline card with wrapper + `AppointmentCardContent` (remove ~120 lines, add ~20) |
| `src/components/dashboard/schedule/AgendaView.tsx` | **Modify** -- Replace inline card with wrapper + `AppointmentCardContent` (remove ~100 lines, add ~25) |
| `src/lib/appointment-card-utils.ts` | **Modify** -- Add indicator priority logic |

### Props Interface (AppointmentCardContent)

```text
variant: 'grid' | 'agenda'
size: 'compact' | 'medium' | 'full'
appointment: PhorestAppointment
isSelected?: boolean
isAssisting?: boolean
hasAssistants?: boolean
colorBy?: 'status' | 'service' | 'stylist'
serviceLookup?: Map<string, ServiceLookupEntry>
assistantNamesMap?: Map<string, string[]>
categoryColors: Record<string, { bg, text, abbr }>
date?: Date
showHoverPreview?: boolean
```

### Estimated Impact

- ~300 lines of duplicated rendering logic consolidated into one component
- Consistent visual language across all three calendar views
- Single place to update card behavior going forward
- Reduced bundle size from deduplication

