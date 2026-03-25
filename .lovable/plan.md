

## Redesign Classify Step with Clear Two-Button Choice

### Problem
The current UI has a confusing mix of a ghost "Standard" button and a "Chemical" label + Switch toggle. It's unclear what action each element performs.

### Solution
Replace the Switch + Standard button combo with two clear, mutually exclusive pill buttons per service row: **"Standard"** and **"Chemical"**. Tapping one classifies the service and it disappears from the list. This is a simple segmented-button pattern — no ambiguity.

### Implementation — `ServiceTrackingQuickSetup.tsx` (lines 113–137)

Replace the current row layout with:

```tsx
{uncategorized.map(s => (
  <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm font-sans truncate">{s.name}</span>
      {isSuggestedChemicalService(s.name, s.category) && (
        <Badge variant="outline" className="...amber...">Suggested</Badge>
      )}
    </div>
    <div className="flex items-center gap-1 shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => classifyMutation.mutate({ id: s.id, isChemical: false })}
      >
        Standard
      </Button>
      <Button
        variant="default"
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => classifyMutation.mutate({ id: s.id, isChemical: true })}
      >
        Chemical
      </Button>
    </div>
  </div>
))}
```

Two distinct buttons with clear labels — no toggle ambiguity. "Chemical" uses the primary/default variant to stand out. Services with the "Suggested" badge nudge users toward Chemical.

### File Modified
- `src/components/dashboard/backroom-settings/ServiceTrackingQuickSetup.tsx` (lines 113–137)

