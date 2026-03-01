

## Eliminate Sheet/Drawer Primitives — Full Migration to PremiumFloatingPanel

### Problem
Every time a new panel surface is built, contributors reach for the `Sheet` or `Drawer` primitives, producing flat Radix/Vaul drawers that don't match the luxury glass bento aesthetic. You then have to retroactively fix each one. The root cause is that these primitives exist and are the path of least resistance.

### Strategy
1. **Extend `PremiumFloatingPanel`** to handle all variants Sheet/Drawer currently cover (right-side, left-side, bottom sheet)
2. **Migrate all 24 consumer files** from Sheet/Drawer to PremiumFloatingPanel
3. **Delete `sheet.tsx` and `drawer.tsx`** so they can never be used again

### PremiumFloatingPanel Enhancements

Add a `side` prop (`'right' | 'left' | 'bottom'`) defaulting to `'right'`:

- **`right`** (current behavior): slides in from right with `x: 80` spring animation
- **`left`**: slides in from left with `x: -80` spring, positioned `left-4 top-4 bottom-4` on desktop, full-width on mobile. Used only by DashboardLayout mobile nav
- **`bottom`**: slides up from bottom with `y: 300` spring, positioned `bottom-0 inset-x-0` with `rounded-t-xl`, `max-h-[85vh]`. Used by MobileAgendaCard and MobileSubmitDrawer

All variants keep the canonical glass aesthetic (`bg-card/80`, `backdrop-blur-xl`, `shadow-2xl`, spring physics).

### Migration Map (24 files)

**Right-side panels (default — straightforward swap):**

| File | maxWidth |
|---|---|
| `sales/DayAppointmentsSheet.tsx` | 440px |
| `analytics/AnalyticsCardReorderDrawer.tsx` | 440px |
| `schedule/AssistantBlockManagerSheet.tsx` | 440px |
| `schedule/DraftBookingsSheet.tsx` | 440px |
| `schedule/CheckoutSummarySheet.tsx` | 560px |
| `payroll/providers/ProviderDetailSheet.tsx` | 560px |
| `leads/LeadDetailsSheet.tsx` | 560px |
| `booth-renters/RenterDetailSheet.tsx` | 640px |
| `reports/scheduled/ScheduledReportsSubTab.tsx` | 560px |
| `day-rate/BookingDetailSheet.tsx` | 560px |
| `marketing/CampaignBudgetManager.tsx` | 720px |
| `settings/KioskLocationStatusCard.tsx` | 720px |
| `settings/KioskSettingsContent.tsx` | 720px |
| `DashboardCustomizeMenu.tsx` | 440px |
| `team-chat/ChannelSettingsSheet.tsx` | 440px |
| `team-chat/ChannelMembersSheet.tsx` | 440px |
| `team-chat/AIChatPanel.tsx` | 440px |
| `team-chat/PinnedMessagesSheet.tsx` | 440px |
| `team-chat/TeamChatAdminSettingsSheet.tsx` | 720px |
| `pages/admin/GraduationTracker.tsx` | 560px |
| `pages/platform/AuditLog.tsx` | 500px |

**Left-side panel:**

| File | maxWidth |
|---|---|
| `DashboardLayout.tsx` (mobile nav) | 288px (w-72) |

**Bottom panels (mobile):**

| File | maxHeight |
|---|---|
| `mobile/schedule/MobileAgendaCard.tsx` | 70vh |
| `MobileSubmitDrawer.tsx` | auto |
| `pages/admin/WebsiteSectionsHub.tsx` | auto |

### Migration Pattern

Each file follows the same mechanical swap:

```text
BEFORE:
  <Sheet open={x} onOpenChange={fn}>
    <SheetContent className="sm:max-w-md">
      <SheetHeader><SheetTitle>...</SheetTitle></SheetHeader>
      {content}
    </SheetContent>
  </Sheet>

AFTER:
  <PremiumFloatingPanel open={x} onOpenChange={fn} maxWidth="440px">
    <div className="p-5 pb-3 border-b border-border/40">
      <h2 className="font-display text-sm tracking-wide uppercase">...</h2>
    </div>
    {content}
  </PremiumFloatingPanel>
```

For files using `SheetTrigger` (inline trigger pattern), the trigger element stays in-place and the panel is controlled via local `useState` — same as PremiumFloatingPanel already requires.

### Deletion

After all migrations, delete:
- `src/components/ui/sheet.tsx`
- `src/components/ui/drawer.tsx`
- Remove `drilldownDialogStyles.ts` Sheet-related exports (`DRILLDOWN_SHEET_CONTENT_CLASS`, `DRILLDOWN_SHEET_OVERLAY_CLASS`)

### Execution Order
1. Extend `PremiumFloatingPanel` with `side` prop (left/bottom variants)
2. Migrate all 24 consumer files (batched by area: sales → schedule → settings → team-chat → pages → layout)
3. Delete `sheet.tsx`, `drawer.tsx`, clean up `drilldownDialogStyles.ts`

### What This Protects
Once Sheet/Drawer are deleted, any future attempt to import them produces a build error — forcing contributors to use `PremiumFloatingPanel` and guaranteeing visual consistency without manual correction.

