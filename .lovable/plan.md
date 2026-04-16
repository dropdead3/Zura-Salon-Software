

# Make Booking Indicator Label Green to Match Dot

## Change — `src/components/dashboard/schedule/DayView.tsx` (line 612)

Update the "Booking" / "Not Booking" label color to match its corresponding dot color instead of using neutral `text-muted-foreground`.

**Current:**
```tsx
<span className="text-[10px] text-muted-foreground whitespace-nowrap">
```

**New:**
```tsx
<span className={cn("text-[10px] whitespace-nowrap", acceptingClients ? "text-emerald-500" : "text-destructive/70")}>
```

When `acceptingClients` is true, the label turns emerald-500 (matching the green dot). When false, it uses `text-destructive/70` (matching the red dot).

One line, one file.

