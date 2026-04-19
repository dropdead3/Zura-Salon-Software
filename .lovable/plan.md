

## Wrap location name across lines + auto-fit by font size

### What & why
"NORTH..." is truncating because we're forcing single-line + 70px width. The user wants the full name visible — wrapped word-by-word, with font size shrinking just enough to fit the available 70×~50px corner cell.

### The change

`src/components/dashboard/schedule/DayView.tsx` (lines 655–663):

Replace the truncating `<span>` with a multi-line wrapper that:
1. **Breaks per word** (`break-words` + no `whitespace-nowrap`, allow natural wrapping; for compound names like "Val Vista Lakes" each word gets its own line if needed)
2. **Auto-shrinks font** based on longest word length:
   - Default: `text-[10px]`
   - If longest word > 7 chars: `text-[9px]`
   - If longest word > 9 chars: `text-[8px]`
   - Floor: `text-[7px]` for any word > 11 chars
3. **Tightens line-height** to `leading-[1.05]` so 2–3 stacked lines fit in the corner cell vertical space
4. Keeps `font-display tracking-wide uppercase` per typography canon, removes `truncate`, keeps `title` attribute as accessibility fallback for the rare overflow case
5. Centers vertically and horizontally; uses `text-center` for balanced multi-line wrap

### Implementation sketch
```tsx
const longestWord = Math.max(...locationName.split(' ').map(w => w.length));
const sizeClass = 
  longestWord > 11 ? 'text-[7px]' :
  longestWord > 9  ? 'text-[8px]' :
  longestWord > 7  ? 'text-[9px]' :
                     'text-[10px]';

<div
  className="w-[70px] shrink-0 bg-sidebar flex items-center justify-center px-1 py-1 text-muted-foreground border-r"
  title={locationName}
>
  <span className={cn(
    'font-display tracking-wide uppercase text-center leading-[1.05] break-words',
    sizeClass
  )}>
    {locationName}
  </span>
</div>
```

### Edge cases
- **"North Mesa"** → wraps to two lines ("NORTH" / "MESA") at 10px — fits cleanly.
- **"Val Vista Lakes"** → three lines at 9px ("VAL" / "VISTA" / "LAKES"), longest word = 5, stays at 10px actually; reads top-to-bottom.
- **"Drop Dead Salons North Mesa"** → 5 words at smaller size; still readable.
- **Single ultra-long word** ("Westmoreland") → drops to `text-[7px]`; if still overflows, browser allows soft break since `break-words` permits it.
- **Single-location orgs**: untouched, still shows `W {weekNumber}`.

### Out of scope
- Widening the 70px gutter (would shift the entire grid).
- Adding similar logic to WeekView (no equivalent corner cell).

### Verification
- "NORTH MESA" displays on two lines, fully visible, no ellipsis.
- Toggle to "VAL VISTA LAKES" → three stacked lines, all visible.
- Single-location org still shows "W 16".

