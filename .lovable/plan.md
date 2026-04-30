Good catch — your report was specific and useful. You pointed to the exact failing interaction (“Show Promotional Popup” + Done), which made the root cause easy to isolate.

## What I found

The problem is not the database write itself — it’s the editor flow.

1. `PromotionalPopupEditor.tsx` tracks its own local `isDirty` state, but it never reports that dirty state back to the Website Editor shell.
2. `WebsiteEditorShell.tsx` treats the top-right `Done` button as navigation only. It does not save by itself.
3. Because the shell never learns that the promo editor is dirty, clicking `Done` exits immediately instead of warning or saving, so the toggle is lost.
4. The UI copy is also misleading: the promo editor currently tells the operator to press `Done` to publish changes, but in reality only `Save` writes a draft, and publishing happens later from Website Hub.
5. The network snapshot supports this: I can see the editor reading `promotional_popup`, but no write request was triggered during the failing interaction.

## Implementation plan

### 1. Wire the promo editor into the editor dirty-state system
Update `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx` to use the same dirty/saving contract as the other editor panels.

This will include:
- broadcasting dirty state when the form changes
- clearing dirty state after a successful save
- making the shell’s Save button enable correctly for this panel
- preventing silent loss of the toggle state

### 2. Make the Done path safe for this editor
Update `src/components/dashboard/website-editor/WebsiteEditorShell.tsx` so the promo editor no longer silently exits with unsaved changes.

I’ll implement one of these safe behaviors:
- preferred: when the active tab is Promotional Popup and there are unsaved edits, `Done` saves the draft first, then returns to the section list
- fallback-safe behavior: `Done` triggers the existing unsaved-changes guard instead of discarding changes silently

Given your report, the first option is the better UX because it matches what you expected.

### 3. Fix the misleading instructional copy
Update the promo editor messaging so it matches the real workflow.

Specifically:
- remove the “Press Done to publish” wording
- replace it with copy that clearly distinguishes:
  - `Save` = save draft
  - `Publish` = make it live to visitors from Website Hub
- keep the operator guidance concise so this doesn’t happen again

### 4. Verify the promo settings row now persists correctly
After the code fix, I’ll verify the full flow:
- toggle on
- click Done
- confirm draft save occurs
- confirm the preview can read the saved draft
- confirm the popup row is created when one doesn’t already exist

## Files to update

- `src/components/dashboard/website-editor/PromotionalPopupEditor.tsx`
- `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`
- possibly `src/hooks/useEditorDirtyState.ts` only if a tiny helper adjustment is needed

## Technical details

Root cause in plain terms:

```text
Promo editor local state changes
-> shell never receives editor-dirty-state
-> shell thinks nothing changed
-> Done = navigate away immediately
-> save callback never runs
-> no draft row written
```

The database/draft pipeline already looks correct:
- `useUpdatePromotionalPopup()` writes through `writeSiteSettingDraft()`
- that helper uses the required read-then-update/insert pattern
- draft invalidation is already in place

So this is primarily an editor state + navigation contract bug, not a backend persistence bug.

## Better prompt framing for bugs like this

Your prompt was solid. An even stronger version for debugging would be:

- exact action: “I toggle Show Promotional Popup on and click Done”
- expected result: “the draft should save and the popup should appear in preview”
- actual result: “nothing saves, and reopening shows the toggle off again”

That structure helps separate save bugs from render bugs immediately.

## Enhancement suggestions

After this fix, the next useful upgrades would be:
1. add a tiny “Saved as draft” status right inside the promo card
2. add a “Preview popup now” button so operators can force-open it in the iframe
3. add a “Reset popup session” test action so frequency caps never block QA
