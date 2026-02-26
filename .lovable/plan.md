

## Establish Drawer/Sheet Design Tokens and Apply Globally

**Problem**: Every new Sheet/Drawer is created with raw ad-hoc classes. The ChaChingDrawer, ScheduledReports, LeadDetails, ChannelSettings, and others all have inconsistent styling — none match the luxury glass bento aesthetic of `PremiumFloatingPanel`.

**Solution**: Add canonical drawer/sheet tokens to `design-tokens.ts`, update the base `sheet.tsx` and `drawer.tsx` primitives to apply glass bento defaults, then audit all consumers.

---

### 1. Add drawer/sheet tokens to `design-tokens.ts`

Add a new `drawer` token group:

```text
drawer: {
  overlay:  'backdrop-blur-sm bg-black/40'
  content:  'bg-card/80 backdrop-blur-xl border-border shadow-2xl'
  header:   'p-5 pb-3 border-b border-border/40'
  body:     'p-5 flex-1 min-h-0 overflow-y-auto'
  footer:   'p-5 pt-3 border-t border-border/40'
  title:    'font-display text-sm tracking-wide uppercase'
  iconBox:  (reuse tokens.card.iconBox)
  icon:     (reuse tokens.card.icon)
}
```

Also add `getTokenFor` entries for `'drawer-content'`, `'drawer-overlay'`, etc.

### 2. Update `sheet.tsx` primitive with glass bento defaults

- Change `SheetOverlay` default from `bg-black/80` to the new `tokens.drawer.overlay` value (`backdrop-blur-sm bg-black/40`).
- Change `SheetContent` base variant from `bg-background p-6 shadow-lg` to `bg-card/80 backdrop-blur-xl border-border shadow-2xl p-0`.
- Keep the `side` variant animations unchanged.
- Update the close button to use `rounded-full bg-muted/60 hover:bg-muted` (matching `PremiumFloatingPanel`).

### 3. Update `drawer.tsx` primitive with glass bento defaults

- Change `DrawerOverlay` from `bg-black/80` to `tokens.drawer.overlay`.
- Change `DrawerContent` base from `border bg-background` to `border-border bg-card/80 backdrop-blur-xl shadow-2xl`.

### 4. Update `ChaChingDrawer.tsx`

- Remove inline glass styling from `SheetContent` className (now inherited from primitive).
- Apply `tokens.drawer.header`, `tokens.drawer.title` to header section.
- Apply `tokens.drawer.body` to scroll area wrapper.

### 5. Update `drilldownDialogStyles.ts`

- Add `DRILLDOWN_SHEET_CONTENT_CLASS` and `DRILLDOWN_SHEET_OVERLAY_CLASS` constants that reference the new tokens, for any Sheet-based drilldowns.

### 6. Audit and update remaining Sheet consumers

Files using raw `SheetContent className=...` that need token alignment:
- `ChannelSettingsSheet.tsx` — add glass backdrop classes
- `ScheduledReportsSubTab.tsx` — add glass backdrop classes
- `DashboardCustomizeMenu.tsx` — add glass backdrop classes
- `TeamChatAdminSettingsSheet.tsx` — add glass backdrop classes
- `LeadDetailsSheet.tsx` — already has flex/overflow, add glass backdrop
- `ChannelMembersSheet.tsx` — add glass backdrop classes
- `MobileAgendaCard.tsx` — bottom sheet, add glass backdrop
- `GraduationTracker.tsx` — add glass backdrop classes
- `CampaignBudgetManager.tsx` — add glass backdrop classes
- `DashboardLayout.tsx` — mobile sidebar sheet (keep as-is, sidebar has own styling)

Since the primitives themselves will carry the glass defaults, most consumers just need their overrides removed or simplified.

### 7. Update `MobileSubmitDrawer.tsx`

- Remove raw classes from `DrawerContent`, apply token-based header/footer styling.

### 8. Update `WebsiteSectionsHub.tsx` mobile drawer

- Remove raw classes, inherit from updated primitive.

---

### Files to modify
- `src/lib/design-tokens.ts` — add `drawer` token group
- `src/components/ui/sheet.tsx` — glass bento defaults
- `src/components/ui/drawer.tsx` — glass bento defaults
- `src/components/dashboard/drilldownDialogStyles.ts` — add sheet constants
- `src/components/dashboard/ChaChingDrawer.tsx` — use tokens
- `src/components/dashboard/MobileSubmitDrawer.tsx` — use tokens
- `src/components/dashboard/DashboardCustomizeMenu.tsx` — simplify overrides
- `src/components/dashboard/leads/LeadDetailsSheet.tsx` — simplify overrides
- `src/components/team-chat/ChannelSettingsSheet.tsx` — simplify overrides
- `src/components/team-chat/TeamChatAdminSettingsSheet.tsx` — simplify overrides
- `src/components/team-chat/ChannelMembersSheet.tsx` — simplify overrides
- `src/components/dashboard/reports/scheduled/ScheduledReportsSubTab.tsx` — simplify overrides
- `src/components/dashboard/marketing/CampaignBudgetManager.tsx` — simplify overrides
- `src/pages/dashboard/admin/GraduationTracker.tsx` — simplify overrides
- `src/pages/dashboard/admin/WebsiteSectionsHub.tsx` — simplify overrides
- `src/components/mobile/schedule/MobileAgendaCard.tsx` — simplify overrides

