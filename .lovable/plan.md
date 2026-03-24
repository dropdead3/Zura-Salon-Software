

## Auto-populate Name in New Client Sheet

### Problem
When a user searches for "Eric Day", gets no results, and clicks "Create 'Eric Day' as new client", the New Client form opens with empty name fields instead of pre-filling with the searched name.

### Changes

**1. `src/components/dock/schedule/DockNewClientSheet.tsx`**
- Add optional `defaultName?: string` prop to `DockNewClientSheetProps`
- On open (when `open` transitions to `true`), parse `defaultName` into first/last name by splitting on the first space — first token → `firstName`, remainder → `lastName`
- Use a `useEffect` keyed on `open` and `defaultName` to set the initial values, only when `open` becomes `true`

**2. `src/components/dock/schedule/DockNewBookingSheet.tsx`**
- Pass `defaultName={clientSearch}` to `<DockNewClientSheet>` (line ~513) so the current search query flows through

### Logic
```ts
// DockNewClientSheet — inside useEffect on open
if (open && defaultName) {
  const trimmed = defaultName.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx > 0) {
    setFirstName(trimmed.slice(0, spaceIdx));
    setLastName(trimmed.slice(spaceIdx + 1));
  } else {
    setFirstName(trimmed);
    setLastName('');
  }
}
```

Two files, minimal change.

