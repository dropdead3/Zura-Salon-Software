

## Fix: Color & Chemical Toggle Visibility in Dark Dock Theme

**Problem:** The `Switch` component uses `bg-primary` for its checked state. In the Dock's dark context, `--primary` resolves to a muted light color (`40 20% 92%` in dark mode) that doesn't contrast well against the dark background — making it nearly invisible when toggled on.

**File:** `src/components/dock/schedule/DockScheduleTab.tsx` (line 148)

**Fix:** Override the Switch's checked background with the Dock's violet platform primary color via className:

```tsx
<Switch
  id="chemical-toggle"
  checked={showChemicalOnly}
  onCheckedChange={setShowChemicalOnly}
  className="data-[state=checked]:bg-[hsl(var(--platform-primary))]"
/>
```

This makes the toggle glow violet when on — consistent with the Dock's design language and clearly visible against the dark background. Single line change.

