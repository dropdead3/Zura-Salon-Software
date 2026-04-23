

# Step 2E — Unify every scrollbar surface to the new canon

The global native scrollbar got the premium treatment in Step 2D, but three other scrollbar systems in the codebase still use their own (older, hardcoded, or off-palette) colors. When you scroll the sidebar nav, a sidebar popover flyout, a dropdown menu, or a `PremiumFloatingPanel` drawer body, you get a different thumb than when you scroll the page — same product, inconsistent chrome.

## What's inconsistent today

| Surface | Mechanism | Current thumb | Problem |
|---|---|---|---|
| Sidebar nav, popovers, dropdowns, drawers (via Radix `ScrollArea`) | `tokens.scrollbar.thumb` | `bg-foreground/15 → foreground/30` on hover | Different token family (`--foreground`) than page scrollbars (`--muted-foreground`). In dark mode reads as a harsher white sliver. |
| Anywhere using `.scrollbar-thin` | CSS utility | `rgba(0,0,0,0.15)` hardcoded | Invisible in dark mode. No theme response. |
| Anywhere using `.scrollbar-minimal` | CSS utility | `rgba(0,0,0,0.15)` hardcoded | Same as above. |
| Duplicate Firefox rule at `index.css:2682-2688` | `*:hover` | `rgba(128,128,128,0.35)` | Overrides the themed Firefox rule 40 lines above it — dead code that blocks theme colors in Firefox. |

Everything should resolve to the same two-state color system we just shipped:
- **Idle:** transparent
- **Hover:** `hsl(var(--muted-foreground) / 0.25)`
- **Hover-on-thumb / active:** `hsl(var(--muted-foreground) / 0.45)` or `primary / 0.5`

## The fix

### 1. `src/lib/design-tokens.ts` — update `tokens.scrollbar.thumb`

Swap the foreground-based colors for muted-foreground, matching the native rules. The `group-hover/scroll` opacity fade stays (it's what gives ScrollArea its "appears on hover" choreography) — we just align the color family.

```ts
scrollbar: {
  track: 'flex touch-none select-none bg-transparent opacity-0 transition-opacity duration-700 ease-in-out group-hover/scroll:opacity-100',
  trackV: 'h-full w-2.5 border-l-[3px] border-l-transparent',
  trackH: 'h-2.5 flex-col border-t-[3px] border-t-transparent',
  // Was: bg-foreground/15 hover:bg-foreground/30
  thumb: 'relative flex-1 rounded-full bg-muted-foreground/25 hover:bg-muted-foreground/45 active:bg-primary/50 transition-colors duration-[180ms]',
},
```

This ripples to every Radix `ScrollArea` — which is what backs the sidebar popover flyouts (`SidebarPopoverContent`), dropdown menus that overflow, Command menu results, and drawer body scrolls.

### 2. `src/index.css` — rewrite `.scrollbar-thin` and `.scrollbar-minimal` to match canon

Replace the hardcoded `rgba` values with the same token-driven hover-reveal pattern as the global scrollbar. Keep the class names (consumers depend on them) and keep their distinct widths (4px minimal, 6px thin, 8px default).

```css
/* .scrollbar-minimal — 4px, used in tight contexts */
.scrollbar-minimal::-webkit-scrollbar { width: 4px; height: 4px; }
.scrollbar-minimal::-webkit-scrollbar-track { background: transparent; }
.scrollbar-minimal::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 9999px;
  transition: background-color 180ms cubic-bezier(0.32, 0.72, 0, 1);
}
.scrollbar-minimal:hover::-webkit-scrollbar-thumb {
  background-color: hsl(var(--muted-foreground) / 0.25);
}
.scrollbar-minimal:hover::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.45);
}
.scrollbar-minimal {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.scrollbar-minimal:hover {
  scrollbar-color: hsl(var(--muted-foreground) / 0.25) transparent;
}

/* .scrollbar-thin — 6px, used in StylistLevelsEditor etc. */
/* Same pattern, 6px width */
```

(`.scrollbar-hide` stays untouched — it's intentionally "no scrollbar at all" for pill rails.)

### 3. `src/index.css` — delete the duplicate Firefox block

Lines 2682-2688 redefine `*` and `*:hover` with `rgba(128,128,128,0.35)`, stepping on the themed Firefox rule at 2631-2638. Delete this block. The earlier themed rule (from Step 2D) handles Firefox correctly.

## Acceptance

1. Scrolling the sidebar nav, a sidebar popover flyout, a dropdown menu, the command palette, or a `PremiumFloatingPanel` drawer body now shows a thumb in the same color family as scrolling the main page.
2. In dark mode, Radix `ScrollArea` thumbs no longer read as a bright-white sliver — they read as a soft muted thumb matching the page.
3. `.scrollbar-thin` (StylistLevelsEditor, any other consumer) is visible in both light and dark mode.
4. Firefox hover color in all surfaces resolves to `--muted-foreground`, not hardcoded gray.
5. `.scrollbar-hide` still hides scrollbars completely (pill rails unchanged).
6. No new rules; no token sprawl — two edits (`tokens.scrollbar.thumb`, two utility rewrites, one deletion).

## Out of scope

- `ScrollBar` component structure in `src/components/ui/scroll-area.tsx` — untouched.
- Changing scrollbar widths — 4/6/8px tiers preserved.
- Overlay/auto-hide behavior on macOS — system-governed, not ours to fight.
- Adding `prefers-reduced-motion` to these transitions — the 180ms fade is already imperceptible; not worth the extra rules.

