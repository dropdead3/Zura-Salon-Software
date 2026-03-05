

## UI Enhancement: Meeting Scheduler Wizard

### Issues Identified

1. **Emojis used instead of Lucide icons** — Lines 44-49 use emoji strings (`👤`, `🤝`, `👥`, `📚`, `📋`) for meeting type icons. This violates the "no emojis, icons only" rule.
2. **Footer gap** — The screenshot shows a large gap between the content and the bottom Cancel/Next buttons. The `ScrollArea` with `flex-1` is expanding to fill remaining space, pushing the footer far below the last content item. The footer should sit snugly below content when content is short.

### Changes (single file: `MeetingSchedulerWizard.tsx`)

#### 1. Replace emojis with Lucide icons in `MEETING_TYPES`

| Meeting Type | Emoji → Icon |
|---|---|
| 1-on-1 | `👤` → `User` icon in a `w-10 h-10 rounded-lg bg-muted` container |
| Interview | `🤝` → `Handshake` icon |
| Team Meeting | `👥` → `Users` icon |
| Training | `📚` → `GraduationCap` icon |
| Other | `📋` → `ClipboardList` icon |

Change the type from `icon: string` to `icon: LucideIcon`, render each in a themed icon box (`tokens.card.iconBox` pattern: `w-10 h-10 bg-muted rounded-lg` with `w-5 h-5 text-primary` icon).

#### 2. Fix footer gap

Change the outer container from `flex flex-col h-full max-h-[85vh]` to include `min-h-0` and make the `ScrollArea` not force-expand when content is short. Replace `flex-1` on ScrollArea with `flex-1 min-h-0` and add `overflow-y-auto` behavior so the panel shrinks to content height rather than always stretching to `85vh`.

Wrap the content area so it uses `flex-1 min-h-0 overflow-y-auto` instead of a full-height ScrollArea, allowing the footer to sit right below content when there's no overflow.

#### 3. Minor polish

- Remove the `← ` unicode arrow on the "Back to meeting types" button (line 349), use `ChevronLeft` icon instead.
- Ensure the `Sparkles` import (line 29) is removed if unused after emoji replacement, keep icons clean.

**One file modified:** `src/components/dashboard/schedule/meetings/MeetingSchedulerWizard.tsx`

