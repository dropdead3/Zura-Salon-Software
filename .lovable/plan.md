

## Fix Drill-Down Toggle Alignment & Slider Interaction

### Problems
1. **Toggle labels sit above pills** (`space-y-1.5` stacks them vertically) instead of being horizontally aligned
2. **Slider thumb ungrabbable** — the parent `motion.tr` has `style={{ overflow: 'hidden' }}` which clips the slider thumb, and the thumb is small (14px)

### Changes — `ServiceTrackingSection.tsx`

**1. Horizontal toggle layout (lines 676–699)**

Change each toggle from vertical `space-y-1.5` to horizontal `flex items-center gap-2`:

```tsx
<div className="flex items-center gap-2">
  <label className="text-[10px] font-sans text-muted-foreground whitespace-nowrap">Assistant Prep</label>
  <Switch ... />
</div>
```

Same for Smart Mix Assist and Formula Memory toggles.

**2. Fix slider interaction (line 640 + slider area)**

- On the `motion.tr`, change `overflow: 'hidden'` to use `overflow: 'clip'` only during the enter/exit animation (or wrap the content div with its own overflow control so the slider thumb isn't clipped during interaction).
- Simpler fix: remove `scale-90` from Switch components (not needed), and ensure the slider area has enough padding so the thumb isn't clipped by overflow hidden. Add `py-1` to the slider's container div so the thumb has breathing room.

**3. Variance Threshold layout**

Keep the label above the slider (it makes sense for a range control), but ensure the label row and slider row are visually grouped with proper spacing.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingSection.tsx` (lines 675–716)

