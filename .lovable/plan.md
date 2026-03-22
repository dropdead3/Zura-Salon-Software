

## Add "Settings" Page Header to Dock Settings Tab

**Problem:** The Settings tab lacks a page header matching the Schedule tab's style ("TODAY'S APPOINTMENTS" + date). It jumps straight into the profile card.

### Change — `src/components/dock/settings/DockSettingsTab.tsx`

**Line 72:** Add a header block before the staff profile card, matching the Schedule tab's visual pattern:

```tsx
<div className="px-5 pt-8 pb-5 border-b border-[hsl(var(--platform-border)/0.15)]">
  <h1 className="font-display text-3xl tracking-wide uppercase text-[hsl(var(--platform-foreground))]">Settings</h1>
  <p className="text-base text-[hsl(var(--platform-foreground-muted))]">Station & account</p>
</div>
```

Move the existing content (profile card, menu items, station location) below the header inside a scrollable area, and adjust the outer container to remove the `py-8` top padding (the header now owns that spacing).

One file, one addition + minor padding adjustment.

