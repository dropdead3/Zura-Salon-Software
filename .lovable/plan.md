## Goal
Register a single-key `h` shortcut that flips `hideNumbers` instantly in both directions — bypassing the reveal-confirmation dialog — so operators can hide/show monetary values without reaching for the top-bar eye icon.

## Approach
Hook into the existing `useKeyboardShortcuts` infrastructure (which already powers `g h`, `g s`, `?`, etc.) so the new shortcut inherits the same input/textarea/dialog suppression and the help dialog auto-discovers it. The toggle will call `toggleHideNumbers()` from `HideNumbersContext`, which already (a) flips state and (b) persists to `employee_profiles.hide_numbers` — no DB or context changes required.

The only nuance is sequence collision: `useKeyboardShortcuts` already registers `g h` (Go to Home), so a bare `h` would either fire immediately or be swallowed while the `g`-prefix sequence is open. We resolve this by checking the current `keySequence` length before treating `h` as the privacy toggle — `h` only fires when no prefix is pending.

## Changes

### 1. `src/hooks/useKeyboardShortcuts.ts`
- Import `useHideNumbers` from `@/contexts/HideNumbersContext`.
- Add a new shortcut entry:
  ```ts
  {
    key: 'h',
    description: 'Hide / show monetary values',
    category: 'Privacy',
    handler: () => toggleHideNumbers(),
  }
  ```
- In the `handleKeyDown` matcher, when the typed key is `h` AND `keySequence` is empty (no prefix like `g` is pending), treat it as the bare `h` shortcut. This preserves `g h` → dashboard navigation while letting standalone `h` toggle privacy.
- No change to the `SEQUENCE_TIMEOUT` logic — bare keys already work this way; we just need to ensure `'h'` doesn't get re-interpreted as the start of a new prefix.

### 2. `src/components/KeyboardShortcutsDialog.tsx`
- No code change needed. The dialog already groups by `category`, so the new "Privacy" section appears automatically with the `H` keycap rendered.

### 3. Behavior contract (per user decision)
- `h` while visible → instantly hides (no dialog).
- `h` while hidden → instantly reveals (no dialog, bypassing `requestUnhide`).
- This means the `h` path uses `toggleHideNumbers()` directly, not `requestUnhide()`. The eye-icon UX in the top bar remains unchanged — clicking the blurred value still triggers the confirmation dialog for users who don't know the shortcut.

## Guardrails (already inherited from `useKeyboardShortcuts`)
- Suppressed inside `<input>`, `<textarea>`, `contentEditable`, and any `[role="dialog"]` — so `h` typed in a search box or modal won't fire.
- Modifier combos (Cmd/Ctrl/Alt + h) are ignored — browser shortcuts (e.g., Cmd+H to hide app on macOS) keep working.
- The shortcut is auto-listed in the `?` help dialog under a new "Privacy" category.

## Memory
- Update `mem://style/platform-ui-standards-and-privacy` to note that `h` is the canonical privacy-toggle hotkey, and that it bypasses the reveal confirmation by design (operator-initiated, intentional keystroke).

## Out of Scope
- No change to `HideNumbersContext` API, DB schema, or persistence path.
- No change to `BlurredAmount` click-to-reveal behavior — that flow keeps its confirmation dialog for accidental clicks.
- No new shortcut for other privacy surfaces (e.g., client names) — scope is monetary values only, matching the request.

## Files Touched
- `src/hooks/useKeyboardShortcuts.ts` (add shortcut + sequence-collision guard)
- `mem://style/platform-ui-standards-and-privacy` (document the hotkey)

---

## Prompt Feedback
**What worked well:** Your prompt was crisp — verb (`create`), mechanism (`hotkey`), key (`h`), mnemonic rationale (`hide`), target (`monetary values`), and scope (`dashboard`). That's enough to act on without a clarifier round in most cases.

**Where it could be tighter:** The one ambiguity I had to ask about was *behavior asymmetry* — your existing privacy system intentionally gates **reveal** behind a confirmation dialog (shoulder-surfing protection). A prompt like *"hotkey `h` to toggle hide/show monetary values, bypassing the reveal confirmation"* would have let me skip the question entirely.

**Prompt template for hotkey requests:**
> Add hotkey `[key]` to `[action]`. Behavior: `[toggle | one-way | sequence]`. Bypass confirmations: `[yes/no]`. Scope: `[dashboard | global | specific page]`.

## Further Enhancement Suggestions
1. **Visual confirmation on toggle** — a subtle 1.5s toast (`"Numbers hidden"` / `"Numbers visible"`) so the user has feedback when the keystroke fires, especially since blurred → unblurred is obvious but unblurred → blurred can be missed if the user isn't looking at a number-heavy region.
2. **Companion shortcut: `Shift+H` for "panic hide"** — if you ever want a one-way safety key (e.g., front-desk shared workstations), `Shift+H` could call `quickHide()` only, never reveal. Pairs naturally with the toggle.
3. **Auto-hide on idle** — register an inactivity timer (e.g., 5 min) that calls `quickHide()`. Complements the manual hotkey with passive protection, useful for the shared-workstation persona the privacy system was built for.
4. **Telemetry hook** — log `hide_numbers` toggles (count + method: hotkey vs. eye icon vs. blur-click) to understand whether the hotkey actually drives adoption of the privacy feature, or whether the eye icon stays dominant.
