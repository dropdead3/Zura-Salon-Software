# Authoring a New Website Editor

Website editors live under `src/components/dashboard/website-editor/`. They share three required hooks. Use this template.

## The three hooks (do not skip any)

```tsx
import { useState, useCallback } from 'react';
import { useMyConfig, type MyConfig, DEFAULT_MY } from '@/hooks/useSectionConfig';
import { useDirtyState } from '@/hooks/useDirtyState';
import { useEditorSaveAction } from '@/hooks/useEditorSaveAction';
import { useSaveTelemetry } from '@/hooks/useSaveTelemetry';
import { triggerPreviewRefresh } from '@/lib/preview-utils';
import { toast } from 'sonner';

export function MyEditor() {
  const __saveTelemetry = useSaveTelemetry('my-editor');           // 1. telemetry scope
  const { data, update } = useMyConfig();
  const [localConfig, setLocalConfig] = useState<MyConfig>(DEFAULT_MY);

  useDirtyState(localConfig, data);                                 // 2. canonical dirty state

  const handleSave = useCallback(async () => {
    try {
      await update(localConfig);
      toast.success('Saved');
      __saveTelemetry.event('save-success');
      triggerPreviewRefresh();
      __saveTelemetry.flush();
    } catch {
      toast.error('Failed to save');
    }
  }, [localConfig, update]);

  useEditorSaveAction(handleSave);                                  // 3. wire Cmd+S + Save button

  return /* form */;
}
```

## Why each hook is non-negotiable

1. **`useSaveTelemetry(scope)`** — groups every save-related event under one scope so a phantom-reset bug produces a single readable trace instead of scattered console noise. See `mem://architecture/site-settings-event-ownership`.

2. **`useDirtyState(local, server)`** — performs a **key-order-stable** structural compare. The naïve `JSON.stringify(local) !== JSON.stringify(server)` pattern is **lint-banned** because it leaves the "Unsaved changes" pill stuck on forever after save (May 2026 hero-editor regression). See `mem://architecture/editor-dirty-state-doctrine`.

3. **`useEditorSaveAction(handleSave)`** — wires the save handler into the floating panel's Save button + the Cmd/Ctrl+S keyboard shortcut + the unsaved-changes guard.

## What NOT to do

| Anti-pattern | Why it's banned | Replacement |
|---|---|---|
| `JSON.stringify(local) !== JSON.stringify(server)` | Key-order sensitive — sticks "Unsaved changes" on after save | `useDirtyState(local, server)` |
| `new CustomEvent('site-settings-draft-write', ...)` outside `siteSettingsDraft.ts` | Empty-detail dispatches caused promo-popup snap-back | Call `writeSiteSettingDraft()` instead |
| Hardcoded fallback strings (`heroConfig?.subheadline ?? "Where talent meets artistry"`) in renderers | Save succeeds, public site never updates | Read straight from config; let empty mean empty |
| `toast.success` inside the mutation hook | Hides errors from the caller's try/catch | Toast in `handleSave`, throw in the hook |

## Renderer contract

If your editor edits a public-facing component (e.g., `<HeroSection>`, `<FAQSection>`):

- **Read every editable field from config** — never hardcode strings the editor "controls".
- **Use `??` not `||`** — operators may want an empty string. `||` falls back to defaults silently.
- **Gate visibility on `show_*` toggles AND content presence** — `if (showField && (line1 || line2))`.

Audit pattern when adding a new field:
```bash
rg -n "your_field_name" src/components/home/ src/components/sections/
```
If the field appears in the config but not in the renderer, the editor will silently no-op.

## Testing checklist

- [ ] Editor renders without errors on first load (`data === undefined`)
- [ ] Type into a field → "Unsaved changes" pill appears
- [ ] Click Save → toast fires → pill clears
- [ ] Reload editor → field shows the saved value, pill stays clear
- [ ] Clear a field → save → public site reflects the empty state (does not fall back to default copy)
- [ ] `Cmd/Ctrl+S` triggers the same save as the Save button

## Related canon

- `mem://architecture/editor-dirty-state-doctrine` — `useDirtyState` enforcement
- `mem://architecture/site-settings-event-ownership` — `site-settings-draft-write` ownership
- `mem://style/unsaved-changes-dialog-canon` — navigate-away dialog
- `mem://style/loader-unification` — loader chain (no raw `Loader2` outside buttons)
