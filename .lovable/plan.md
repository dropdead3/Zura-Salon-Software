

## Fully Round Tab Bar + Tokenize in Dock UI Tokens

### Changes

**1. `src/components/dock/dock-ui-tokens.ts`** — Add new `DOCK_TABS` token group:

```ts
export const DOCK_TABS = {
  bar: 'flex gap-1 bg-[hsl(var(--platform-bg-card))] rounded-full p-2 border border-[hsl(var(--platform-border)/0.2)]',
  trigger: 'flex items-center justify-center gap-1.5 flex-1 h-12 rounded-full text-sm font-medium transition-all duration-150',
  triggerActive: 'bg-violet-600/30 text-violet-300',
  triggerInactive: 'text-[hsl(var(--platform-foreground-muted))] hover:text-[hsl(var(--platform-foreground))]',
  icon: 'w-4 h-4',
} as const;
```

Key shape changes: `rounded-2xl` → `rounded-full` on bar, `rounded-xl` → `rounded-full` on triggers.

**2. `src/components/dock/appointment/DockAppointmentDetail.tsx`** — Import `DOCK_TABS` and replace inline classes:

```tsx
import { DOCK_TABS } from '@/components/dock/dock-ui-tokens';

// Tab bar
<div className={DOCK_TABS.bar}>
  {TABS.map(({ id, label, icon: Icon }) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={cn(DOCK_TABS.trigger, tab === id ? DOCK_TABS.triggerActive : DOCK_TABS.triggerInactive)}
    >
      <Icon className={DOCK_TABS.icon} />
      {label}
    </button>
  ))}
</div>
```

Two files, minimal change.

