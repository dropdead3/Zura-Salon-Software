

## Remove Bottom Gradient from Appointment Detail View

### Problem
The bottom fade gradient in `DockLayout.tsx` is gated on `activeTab === 'schedule'`, but when you tap into an appointment detail, `activeTab` remains `'schedule'` — so the gradient bleeds through onto the services/bowl view where it doesn't belong.

### Fix — `src/components/dock/DockLayout.tsx`

Update the condition from:
```ts
activeTab === 'schedule'
```
to:
```ts
activeTab === 'schedule' && !showingDetail
```

This ensures the bottom fade only appears on the appointments list, not on any appointment detail tab (services, notes, summary, client).

### One line changed
`src/components/dock/DockLayout.tsx` — add `&& !showingDetail` to the gradient conditional.

