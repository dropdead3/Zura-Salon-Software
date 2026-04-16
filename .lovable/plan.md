

## Fix

The Row 1 wrapper opened at L154 was never closed. The comment at L266 ("End Row 1 wrapper") sits where the missing `</div>` should be.

Trace of the dark header:
- L152 opens Dark Header
- L154 opens Row 1 wrapper
- L156 opens Left View Toggle cluster → closed at L265
- L265 closes L156, but Row 1 wrapper (L154) remains open
- L269 opens Row 2 wrapper — but it's now nested *inside* Row 1 instead of being a sibling

End-of-file currently has `</div></div></div>` at L657-659, which only closes 3 levels but we have 4 levels open (root, Dark Header, Row 1, Row 2's chain ending at Dark Header level via L484-486).

**Single fix**: Insert a `</div>` between L265 and L269 to close the Row 1 wrapper (replacing the comment placement at L266).

```
</div>
{/* End Row 1 wrapper... */}

{/* Row 2 wrapper... */}
<div className="flex items-center justify-between @md/schedhdr:contents">
```

becomes:

```
</div>  ← closes L156 left cluster
</div>  ← NEW: closes L154 Row 1 wrapper
{/* End Row 1 wrapper... */}

{/* Row 2 wrapper... */}
<div className="flex items-center justify-between @md/schedhdr:contents">
```

That single inserted `</div>` rebalances the tree, satisfies all four reported errors (the dangling JSX cascade), and restores the intended sibling layout (Row 1 and Row 2 as peers inside the Dark Header).

## File touched

- `src/components/dashboard/schedule/ScheduleHeader.tsx` — insert one `</div>` at L266 to close the Row 1 wrapper.

