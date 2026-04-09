

# Fix FAB Chat Modal Toggle & Padding

## Issues Identified
1. **Tab toggle not rendering as pill**: The `TabsList` component has `style={{ borderRadius: 9 }}` and `TabsTrigger` has `style={{ borderRadius: 6 }}` as inline styles, which override the `rounded-full` Tailwind classes applied in HelpFAB. The base `bg-muted/70` also clashes with the custom `bg-card/60`.
2. **Active tab blending in**: The base TabsTrigger styles (`data-[state=active]:bg-black/[0.07]`, ring, shadow) conflict with the custom `data-[state=active]:bg-primary` — specificity war causes the active state to look washed out.
3. **Padding issues**: The tab header area (`px-4 pt-3 pb-0`) is tight, and the gradient divider sits too close to the tabs.

## Changes

### File: `src/components/dashboard/HelpFAB.tsx`
- Override the inline `borderRadius` on `TabsList` by adding `style={{ borderRadius: '9999px' }}` directly
- Add `!rounded-full` or use style prop on `TabsTrigger` to force pill shape
- Increase header padding: `px-4 pt-4 pb-2` for breathing room
- Reset conflicting base styles on TabsTrigger: add `data-[state=active]:shadow-none data-[state=active]:ring-0` to eliminate base component interference
- Add `py-1.5` to TabsList for taller pill container

### File: `src/components/dashboard/help-fab/AIHelpTab.tsx`
- Adjust empty state container height from `h-[320px]` to `h-[340px]` to account for increased header padding
- Tighten input area: reduce bottom padding slightly from `p-3` to `px-3 pb-3 pt-1` since the gradient line provides separation

## Technical Details
- The root cause is inline `style` on the shared Tabs components overriding Tailwind border-radius — we fix this with inline `style` props on the HelpFAB instances rather than modifying the shared component
- No new dependencies, ~10 lines changed across 2 files

