# Add explicit "Save Draft" to Website Editor

## What you actually have today (good news)

The save/publish split already exists architecturally — you just can't see it:

- Every editor (Hero, Brand, Footer, etc.) calls `useEditorSaveAction(handleSave)`. That `handleSave` writes to `site_settings` rows, which are **draft state**.
- The public site does NOT read `site_settings` directly — it reads a published snapshot promoted by `usePublishAll` (the Publish dialog).
- So changes you make in the editor are already private until you click Publish.

What's missing is two things:
1. There's no **Save** button in the toolbar — only Publish. So users (correctly) think Publish is the only way to persist.
2. `⌘S` is bound to "open Publish dialog" instead of "save draft", which reinforces the confusion.

## Plan

### 1. Add a "Save Draft" button to the toolbar — `WebsiteEditorShell.tsx`

Place it immediately to the left of the Save-status pill (and Publish), in the right cluster:

```
[ Saved 2m ago ]  [ Save Draft ]  [ ● Publish ]  [ Canvas ]  [ … ]
```

- Variant: `outline` (so Publish remains the only filled button — preserves visual hierarchy).
- Shape: `rounded-full` to match Wave 6 pill canon.
- Icon: `Save` (lucide).
- onClick: `window.dispatchEvent(new CustomEvent('editor-save-request'))` — reuses the existing infrastructure that every editor already listens for.
- Disabled when `!isDirty` (nothing to save) OR `isSaving`.
- Shows inline `Loader2` spinner when `isSaving`.
- Title/tooltip: `"Save draft (⌘S) — only published changes go live"`.

### 2. Remap keyboard shortcuts — `WebsiteEditorShell.tsx`

- `⌘S` → dispatch `editor-save-request` (save draft). Works inside form fields too — preempt the browser's "Save Page" default.
- `⌘⇧S` → open Publish dialog (the new "promote to live" shortcut).
- `⌘P`, `⌘K`, `⌘\` unchanged.

### 3. Clarify the Publish button's secondary copy — `WebsiteEditorShell.tsx`

Update its `title` attribute from `"Publish changes (⌘S)"` to `"Publish draft to live site (⌘⇧S)"`. This communicates the two-stage model in the tooltip without adding visual noise.

### 4. Update SaveStatusPill copy — `WebsiteEditorShell.tsx`

Currently says "Unsaved changes" / "Saved 2m ago". Change "Saved 2m ago" → "Draft saved 2m ago" so users see explicitly that what they saved is still a draft, not live.

## What this does NOT change

- No schema changes. `site_settings` already is the draft store.
- No edge function changes. Publish flow (`usePublishAll`) untouched.
- No editor file changes. The 15+ editor components already call `useEditorSaveAction(handleSave)` — they'll respond to ⌘S and the new button automatically.
- No changes to autosave/dirty-tracking — those are correct already.

## Files touched

Just one: `src/components/dashboard/website-editor/WebsiteEditorShell.tsx`

## Risk

Low. The only behavioral change for existing users is `⌘S` no longer opens Publish — and that's intentional, because the previous binding misrepresented the intent. Power users who want Publish-via-keyboard get `⌘⇧S` (the standard "elevated save" pattern across editors like Figma and Notion).

## Prompt feedback

What you did well: clear, specific, problem-framed — *"I need to be able to save changes without publishing"* names both the desired capability AND the current friction (perceived coupling). That's a high-signal prompt.

What would have been even sharper: a one-line "what I expect" — e.g. *"…and I want a button next to Publish that says Save"* or *"…and ⌘S should save without publishing"*. Right now I had to infer the surface (button vs. only autosave vs. only shortcut). With the inference explicit, you'd skip a planning round.

Bonus pattern: when filing UX gaps like this, naming the specific moment of confusion ("I clicked Publish because I thought it was the only way to save") helps me pick the right fix — copy clarification vs. new affordance vs. shortcut remap. Here, all three are warranted, which is why the plan addresses each.
