

## Fix Drag Handle Placement — Bottom of Top-Anchored Sheets

### Problem
Top-anchored sheets slide down from the top, so the drag handle should be at the **bottom** of the panel (where the user grabs to dismiss upward). Several sheets incorrectly place it at the top. The `DOCK_SHEET.dragHandle` token doesn't encode position, so each sheet places it differently.

### Token Change — `src/components/dock/dock-ui-tokens.ts`

Split `dragHandle` into two tokens to make placement explicit:

```ts
dragHandle: 'mx-auto h-1.5 w-12 rounded-full bg-[hsl(var(--platform-foreground-muted)/0.3)] shrink-0 cursor-grab active:cursor-grabbing touch-none',
dragHandleWrapperBottom: 'flex justify-center pt-2 pb-4',
```

The base `dragHandle` removes the `mb-3` margin (each wrapper controls spacing). The wrapper token standardizes the bottom-positioned container.

### Sheets to Fix (move drag handle to bottom of panel)

1. **`DockFormulaHistorySheet.tsx`** — Move drag handle from above header to after the scrollable content area (end of panel)
2. **`DockClientQuickView.tsx`** — Move drag handle from top to bottom of panel

### Sheets Already Correct (verify use token)

3. **`DockNewBowlSheet.tsx`** — Already at bottom, just use the token class
4. **`DockHamburgerMenu.tsx`** — Already at bottom, use token
5. **`DockNewBookingSheet.tsx`** — Already at bottom, use token
6. **`DockNewClientSheet.tsx`** — Already at bottom, use token
7. **`DockSessionCompleteSheet.tsx`** — Already at bottom, use token
8. **`DockProductPicker.tsx`** — Already at bottom, use token

### Pattern
Every top-anchored sheet should follow this structure:
```
<motion.div panel>
  {/* Header */}
  {/* Content */}
  {/* Drag handle — always last child */}
  <div className={DOCK_SHEET.dragHandleWrapperBottom}>
    <div className={DOCK_SHEET.dragHandle} onPointerDown={...} />
  </div>
</motion.div>
```

