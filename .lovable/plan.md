

## Inline Services with Client Name + "+X more" Overflow

**Problem:** Services are on a separate line below the client name. They should be inline on the same line, separated by a dot, with a "+X more" indicator when they overflow.

### Changes — `src/components/dock/schedule/DockAppointmentCard.tsx`

**Replace the two-line client/service block (lines 117-132) with a single-line layout:**

1. **Parse services** from `appointment.service_name` (split on ` + `) into an array
2. **Render inline:** `Client Name · Service1 + Service2 +3 more` all on one truncated line
3. **Logic:** Show the client name, then a `·` separator, then as many services as fit. Use a helper that builds the display string:
   - If 1 service: show it directly
   - If 2+ services: show first service, then `+X more` suffix
   - The whole line gets `truncate` so it clips gracefully

```tsx
// Helper inside cardContent
const services = (appointment.service_name || '').split(' + ').filter(Boolean);
const serviceDisplay = services.length <= 1
  ? services[0] || ''
  : `${services[0]} +${services.length - 1} more`;

// Single line render
<p className={cn('text-lg truncate', visible ? 'font-medium text-[hsl(var(--platform-foreground))]' : '')}>
  {appointment.client_name || 'Walk-in'}
  {serviceDisplay && (
    <span className={cn('font-normal', visible ? 'text-[hsl(var(--platform-foreground-muted))]' : '')}>
      {' · '}{serviceDisplay}
    </span>
  )}
</p>
```

This removes the second `<p>` for services entirely. Everything is on one line: client name in medium weight, then dot + services in muted weight, with "+X more" when there are multiple services. The `truncate` on the parent `<p>` handles overflow at the card edge.

Single file, one block replacement.

