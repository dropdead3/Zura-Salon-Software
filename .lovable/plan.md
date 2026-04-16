
## Prompt review

Good catch — your prompt clearly identified the actual symptom: the letters are disabled because the initial client batch only contains A-names. Better prompt framing for next time: name the exact surface too, e.g. “Quick booking popover from clicking a time slot” or “toolbar booking wizard,” because both surfaces have similar client pickers.

## Diagnosis

The remaining bug is not the server-side letter filter itself anymore — it is the **button availability logic**.

Right now both client pickers still do this:
- load a default batch of 50 alphabetically sorted clients
- build `availableLetters` from that currently loaded batch
- disable every letter not present in that batch

So if the first 50 records are all A’s, only **A** is clickable, which blocks the server-side query from ever running for B-Z.

This same pattern exists in both places:
- `src/components/dashboard/schedule/booking/ClientStep.tsx`
- `src/components/dashboard/schedule/QuickBookingPopover.tsx`

## Fix plan

1. **Treat server-controlled alphabet filters differently**
   - In both client picker components, when letter filtering is controlled by the parent (`onLetterChange` exists), stop deriving clickable letters from the currently loaded client list.
   - Make **all A-Z letters clickable** in controlled mode.

2. **Keep current limited availability logic only for local-only filtering**
   - If the picker is ever used in uncontrolled/client-only mode, it can still disable letters based on the local dataset.
   - But for booking surfaces using server fetches, every letter must remain selectable.

3. **Preserve the existing server-side fetch behavior**
   - Clicking any letter should continue to:
     - set `activeLetter`
     - clear text search
     - refetch clients with `name ilike 'LETTER%'`
   - Clicking the same letter again should clear the filter.

4. **Keep empty-state behavior for truly missing letters**
   - If a user clicks `Q` or `Z` and no clients exist, show the existing “No clients starting with…” state instead of disabling that letter in advance.

## Files to update

- `src/components/dashboard/schedule/booking/ClientStep.tsx`
  - Change alphabet availability logic so all letters are enabled in controlled mode.
- `src/components/dashboard/schedule/QuickBookingPopover.tsx`
  - Apply the same change to `ClientListWithAlphabet`.

## Acceptance checks

1. Open the booking wizard/popover client step with the default A-heavy list.
2. Click `M` even though the visible list only shows A’s.
3. The list reloads with M-names.
4. Click `Z` and it also triggers a fetch.
5. If no Z-clients exist, show the empty state instead of disabling the letter.
6. Search text still clears letter selection, and letter selection still clears search.
7. Clicking the active letter again clears the filter.

## Follow-up enhancement

After this fix, the next cleanup would be to consolidate `ClientStep` and `ClientListWithAlphabet` into one shared client-picker so this bug cannot drift between booking surfaces again.
