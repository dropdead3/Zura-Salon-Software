

## Fix "Edit" Allowance Button Contrast in Dark Mode

### Problem
The "Edit" button on the allowance row uses `variant="ghost"` with `text-muted-foreground hover:text-foreground`. In dark mode, the ghost hover background is light, and `text-muted-foreground` is also light — producing a washed-out light-on-light appearance.

### Solution
1. **Add a new token** in `design-tokens.ts` for inline ghost action buttons that ensures proper contrast in both themes:
   ```ts
   button: {
     // ... existing tokens
     /** Inline ghost action — muted text, contrasts on hover */
     inlineGhost: 'h-6 px-2 text-[10px] font-sans text-muted-foreground hover:text-primary-foreground hover:bg-primary/90',
   }
   ```
   Using `hover:text-primary-foreground hover:bg-primary/90` ensures the hover state has a tinted background with guaranteed contrasting text, avoiding the light-on-light issue entirely.

2. **Update the Edit button** in `ServiceTrackingSection.tsx` (line ~784–797) to use the new token:
   ```tsx
   <Button
     variant="ghost"
     size="sm"
     className={tokens.button.inlineGhost}
     onClick={...}
   >
     Edit
   </Button>
   ```

3. **Audit for other ghost buttons** in the same file using the same `text-muted-foreground hover:text-foreground` pattern and apply the token consistently (e.g., the "Clear Allowance" button if it shares the same issue).

### Scope
- 2 files: `design-tokens.ts` (1 line), `ServiceTrackingSection.tsx` (~2 lines)
- No logic changes — purely visual/token fix

