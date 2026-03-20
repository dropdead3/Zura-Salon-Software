

## Move "New client — first visit" Badge Inline on Client Card

### Change

**`src/components/dock/schedule/DockNewBookingSheet.tsx`** — Confirm step (lines 1113–1156)

1. **Remove the standalone banner** (lines 1152–1156): Delete the separate `New client — first visit` div that sits below the client card.

2. **Badge the client card**: When `clientHistory?.visitCount === 0`, add a ghost-styled badge on the right side of the client card (line 1113–1123), vertically centered using `items-center`. The badge text: "New client — first visit" with Sparkles icon, styled ghost (no background fill, just subtle border/text):

```
// Inside the client card div (line 1113), add after flex-1 block:
{clientHistory && clientHistory.visitCount === 0 && (
  <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-violet-500/30 shrink-0">
    <Sparkles className="w-3 h-3 text-violet-400" />
    <span className="text-[10px] text-violet-400 whitespace-nowrap">New client — first visit</span>
  </div>
)}
```

This keeps the client card compact while surfacing the new-client indicator inline, right-aligned and vertically centered.

