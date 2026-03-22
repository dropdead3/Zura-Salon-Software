

## Vertically Align Add Button with Header Title

**Problem:** The `+` button is vertically centered against the entire header block (title + date subtitle), making it appear slightly low relative to the "Today's Appointments" heading.

### Change — `src/components/dock/schedule/DockScheduleTab.tsx`

**Line 203:** Change `items-center` to `items-start` on the header flex container, so both elements align to the top. Then add a small `mt-1` to the button to fine-tune alignment with the title's visual center:

```tsx
<div className="flex items-start justify-between px-5 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]">
```

And on the button (line 212-216), add `mt-1` to nudge it down slightly so it sits visually centered with the title line:

```tsx
className="flex items-center justify-center w-14 h-14 rounded-xl bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors mt-1"
```

One file, two class adjustments.

