

## Add L-Shaped Hook Connector to Assistant Line

**Goal:** Indent the assistant info line and add an L-shaped visual connector (like a tree-view branch) to show that the assistant is subordinate/attached to the appointment. This is a common UI pattern in threaded lists and org charts.

**File:** `src/components/dock/schedule/DockAppointmentCard.tsx` — lines 174-181

**Change:** Replace the current flat assistant row with an indented version that has an L-shaped connector drawn with a border trick:

```tsx
{appointment.assistant_names && appointment.assistant_names.length > 0 && (
  <div className="flex items-start mt-1 ml-1">
    {/* L-hook connector */}
    <div className="w-3 h-4 border-l border-b border-[hsl(var(--platform-foreground-muted)/0.25)] rounded-bl-sm shrink-0 mr-1.5" />
    <div className="flex items-center gap-1 pt-1">
      <Users className="w-4 h-4 text-[hsl(var(--platform-foreground-muted)/0.5)] shrink-0" />
      <span className="text-base text-[hsl(var(--platform-foreground-muted)/0.8)]">
        {formatAssistantLabel(appointment.assistant_names)}
      </span>
    </div>
  </div>
)}
```

The L-hook is a simple `div` with `border-l` + `border-b` + `rounded-bl-sm` — a left edge going down then turning right. Muted at 25% opacity so it reads as a subtle structural connector, not a loud decoration. The `ml-1` indent shifts the whole block slightly right to nest it under the time line.

Single file, one block replacement.

