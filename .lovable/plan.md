

## Remove Focus Ring Halos from All UI Primitives

The `Input` component already follows the correct pattern: `focus-visible:outline-none focus-visible:border-foreground/30` with no ring. All other primitives still use the old `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` pattern that produces the visible halo.

### Changes

**Replace `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` with `focus-visible:outline-none` (no ring) in these files:**

1. **`src/components/ui/button.tsx`** — Remove ring classes from `buttonVariants` base string
2. **`src/components/ui/select.tsx`** — `SelectTrigger`: replace `focus:ring-2 focus:ring-ring focus:ring-offset-2` with `focus:outline-none focus:border-foreground/30`
3. **`src/components/ui/tabs.tsx`** — `TabsTrigger`: remove ring from base classes
4. **`src/components/ui/tabs.tokens.ts`** — Remove `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` from all token strings (trigger, content, subTrigger, filterTrigger, overflowTrigger)
5. **`src/components/ui/toggle.tsx`** — Remove ring from `toggleVariants`
6. **`src/components/ui/switch.tsx`** — Remove ring from Switch root
7. **`src/components/ui/checkbox.tsx`** — Remove ring from Checkbox
8. **`src/components/ui/radio-group.tsx`** — Remove ring from RadioGroupItem
9. **`src/components/ui/slider.tsx`** — Remove ring from Thumb
10. **`src/components/ui/resizable.tsx`** — Remove ring from resize handle
11. **`src/components/platform/ui/PlatformButton.tsx`** — Remove ring from platform button base

All replacements are mechanical: strip `ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (and the `focus:` variants), keep `focus-visible:outline-none`. For bordered elements like Select, add `focus-visible:border-foreground/30` to maintain a subtle focus indicator.

