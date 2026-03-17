

## Fix Platform Tab Menu Styling

The issue is that the `TabsList` and `TabsTrigger` from `@/components/ui/tabs` carry light-theme base styles (`bg-muted/70`, `text-muted-foreground`, `data-[state=active]:bg-black/[0.07]`, active ring colors) that bleed through even with the custom overrides in `BackroomAdmin.tsx`. The platform CSS variables are being partially overridden but the base component defaults still show light-theme artifacts.

### Changes in `src/pages/dashboard/platform/BackroomAdmin.tsx`

**1. Fix TabsList styling (line 30):**
Override the base `bg-muted/70` and `text-muted-foreground` defaults with full platform-aware classes:
```
bg-[hsl(var(--platform-bg-card)/0.5)] border border-[hsl(var(--platform-border)/0.5)] p-1
```
Add `!bg-[hsl(var(--platform-bg-card)/0.5)]` with `!important` modifier or use a more specific reset to ensure base `bg-muted/70` is overridden.

**2. Fix TabsTrigger styling (line 17 — `tabTriggerClass`):**
The current class only handles `data-[state=active]` bg/text and hover text. It does not override the base trigger's active ring (`ring-black/[0.10]`), active backdrop, or inactive hover ring. Update `tabTriggerClass` to fully neutralize these:

```typescript
const tabTriggerClass =
  'data-[state=active]:bg-violet-600 data-[state=active]:text-white ' +
  'data-[state=active]:shadow-none data-[state=active]:ring-0 ' +
  'data-[state=inactive]:hover:ring-0 ' +
  'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))] ' +
  'hover:bg-[hsl(var(--platform-border)/0.3)]';
```

This removes the light-theme active ring/shadow and inactive hover ring, and adds a subtle platform-themed hover background.

