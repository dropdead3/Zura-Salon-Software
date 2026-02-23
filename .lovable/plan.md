

# Fix: Duplicate Clients "Lost" After Editing

## Problem Summary

Two interconnected bugs cause both records in a duplicate pair to "disappear" after editing:

1. **Stale duplicate flags**: When you edit a client's name/phone to break the duplicate match, the `is_duplicate` and `canonical_client_id` fields in the database are never re-evaluated. They persist even though the records no longer match, keeping both cards trapped in the Duplicates tab.

2. **Alphabet filter not reset**: The alphabet letter filter (e.g. "E" for Eric) persists when switching tabs. After renaming "Eric Day" to "Test Test", both records now start with "T" but the filter is still stuck on "E", hiding everything.

3. **Minor**: The list heading says "New Clients" for the Duplicates/Banned/Archived tabs instead of the correct label.

## Solution

### 1. Database trigger to re-evaluate duplicate status on edit

Add a trigger on `phorest_clients` that fires after UPDATE. When `email`, `phone`, or `name` changes on a record:
- If the record has `is_duplicate = true`, check if it still matches its canonical on `email_normalized` or `phone_normalized`. If neither matches, clear `is_duplicate` and `canonical_client_id`.
- Also check the reverse: if the updated record is a canonical (i.e., other records point to it), clear the duplicate flags on those records if they no longer match.

### 2. Reset alphabet filter when tab changes

Add a `useEffect` that sets `selectedLetter` back to `'all'` whenever `activeTab` changes, preventing stale letter filters from hiding results.

### 3. Fix heading label

Update the heading on line 711 to include cases for `'duplicates'`, `'banned'`, and `'archived'` tabs.

## Technical Details

### Database migration (new SQL migration)

```sql
CREATE OR REPLACE FUNCTION public.reevaluate_duplicate_status()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if no identity fields changed
  IF OLD.email_normalized IS NOT DISTINCT FROM NEW.email_normalized
     AND OLD.phone_normalized IS NOT DISTINCT FROM NEW.phone_normalized THEN
    RETURN NEW;
  END IF;

  -- Case 1: This record is a duplicate -- check if it still matches its canonical
  IF NEW.is_duplicate = true AND NEW.canonical_client_id IS NOT NULL THEN
    PERFORM 1 FROM phorest_clients c
    WHERE c.id = NEW.canonical_client_id
      AND (
        (NEW.email_normalized IS NOT NULL AND c.email_normalized = NEW.email_normalized)
        OR
        (NEW.phone_normalized IS NOT NULL AND c.phone_normalized = NEW.phone_normalized)
      );
    IF NOT FOUND THEN
      NEW.is_duplicate := false;
      NEW.canonical_client_id := NULL;
    END IF;
  END IF;

  -- Case 2: This record is a canonical -- clear orphaned duplicates
  IF NEW.is_duplicate = false THEN
    UPDATE phorest_clients dup
    SET is_duplicate = false, canonical_client_id = NULL
    WHERE dup.canonical_client_id = NEW.id
      AND dup.is_duplicate = true
      AND NOT (
        (dup.email_normalized IS NOT NULL AND NEW.email_normalized IS NOT NULL
         AND dup.email_normalized = NEW.email_normalized)
        OR
        (dup.phone_normalized IS NOT NULL AND NEW.phone_normalized IS NOT NULL
         AND dup.phone_normalized = NEW.phone_normalized)
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER reevaluate_duplicate_status_trigger
  BEFORE UPDATE ON public.phorest_clients
  FOR EACH ROW EXECUTE FUNCTION public.reevaluate_duplicate_status();
```

### Frontend changes (ClientDirectory.tsx)

**Reset alphabet on tab change** -- add a useEffect:
```typescript
useEffect(() => {
  setSelectedLetter('all');
}, [activeTab]);
```

**Fix heading label** -- update line 711 to handle all tab types:
```typescript
activeTab === 'all' ? 'Clients'
  : activeTab === 'vip' ? 'VIP Clients'
  : activeTab === 'at-risk' ? 'At-Risk Clients'
  : activeTab === 'new' ? 'New Clients'
  : activeTab === 'duplicates' ? 'Duplicate Clients'
  : activeTab === 'banned' ? 'Banned Clients'
  : activeTab === 'archived' ? 'Archived Clients'
  : 'Clients'
```

