

## Add Distinct Colorway for Non-Color/Chemical Appointments

**Problem:** All appointment cards share the same dark card background regardless of whether they involve color/chemical services. When the "Color & Chemical" filter is off, there's no visual distinction between chemical and non-chemical appointments.

**Approach:** Give non-color/chemical appointment cards a subtly different card background — a cooler, slightly muted tone — while color/chemical cards keep the current warm-tinted style. This lets staff instantly scan which clients need chemical prep.

### Changes

**File: `src/components/dock/schedule/DockScheduleTab.tsx`**

1. **Determine color/chemical status per appointment** before passing to card. In the `AppointmentGroup` render, compute and pass an `isChemical` prop:

```tsx
<DockAppointmentCard
  key={a.id}
  appointment={a}
  accentColor={accentColor}
  isChemical={isColorOrChemicalService(a.service_name)}
  ...
/>
```

**File: `src/components/dock/schedule/DockAppointmentCard.tsx`**

2. **Accept `isChemical` prop** in the component interface.

3. **Apply distinct card styling based on `isChemical`:**
   - **Chemical appointments (current look):** Keep `bg-[hsl(var(--platform-bg-card))]` with existing border
   - **Non-chemical appointments:** Use a cooler, slightly recessed tone: `bg-[hsl(var(--platform-bg-card)/0.6)]` with a subtle blue-grey left border instead of the status-based violet/blue/slate

   Specifically, for non-chemical cards:
   - Card background: `bg-[hsl(var(--platform-bg-card)/0.7)]` (slightly more transparent/recessed)
   - Left border: `border-l-[hsl(var(--platform-foreground-muted)/0.3)]` (neutral muted tone instead of colored accent)

   This creates a clear two-tier visual hierarchy: chemical cards "pop" with their colored accent borders and full card opacity, while non-chemical cards recede with muted borders and reduced opacity.

Two files, minimal changes — a prop pass-through and conditional class application.

