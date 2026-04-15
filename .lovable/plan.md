

## Fix: Tighten Scheduler Header Icon Spacing

### Problem
The right-side icon buttons (Assistant Blocks, Drafts, Today's Prep, Settings) in the scheduler top bar use `gap-3` spacing, causing them to spread too wide and overflow off the header.

### Fix
**1 file**: `src/components/dashboard/schedule/ScheduleHeader.tsx`

**Line 235**: Change the right-side container from `gap-3` to `gap-1` to match standard icon button spacing:
```tsx
// Before
<div className="flex items-center gap-3">

// After  
<div className="flex items-center gap-1">
```

This brings the icons closer together and keeps them within the top bar, consistent with how other headers (e.g., `ChannelHeader`) space their icon buttons.

