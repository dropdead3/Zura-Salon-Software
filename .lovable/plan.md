

# Step 2X + 2Y — Deferral Register entry, and Canon Catalog

Two memory-only edits to `mem://architecture/canon-pattern.md`. Both are pure documentation/lookup additions — no code, no tests, no CI changes. The memory file currently documents the abstract pattern (5-part structure, when-not-to-add, one worked example). After these edits it also tracks (a) what's deferred and when to revisit, and (b) every canon that exists today.

## Part A — Deferral Register entry (Step 2X)

**The gap**: `docs/ci.md` line 74 says "add `check` to required status checks. Until this is configured, the gate reports but does not block merge." That's a real deferred-action footnote with no revisit trigger anywhere — it lives only in a docs paragraph. Per the Core memory rule ("Deferral Register: deferred infrastructure must declare its revisit trigger condition. Tracked in `mem://architecture/visibility-contracts.md` Deferral Register table"), this needs a tracked entry.

**The change**: Add a new "Deferral Register" section to `mem://architecture/canon-pattern.md` (canon-pattern is the right home — branch protection is the canon-enforcement layer, not a visibility-contract concern). One-row table:

| Item | Owner | Revisit trigger | Where it lives today |
|------|-------|-----------------|----------------------|
| Add `check` to GitHub required status checks on `main` | Repo admin | First merge of a PR with a real canon violation that CI catches but doesn't block | `docs/ci.md` §"Branch protection (repo admin, one-time)" |

Plus a one-line preface explaining the section's purpose (mirrors the visibility-contracts memory's table preamble).

## Part B — Canon Catalog (Step 2Y)

**The gap**: Five canons exist (no-raw-rgba, semantic-token, theme-completeness, cross-theme-parity, cross-mode-gradient-parity). The next contributor adding canon #6 has to grep `src/test/` to discover what's already enforced. The memory documents the abstract pattern but not the concrete inventory.

**The change**: Add a "Catalog" section after "When NOT to add a canon" and before the worked example. Format: one row per canon with file path, axis, and one-line invariant.

| Canon | File | Invariant |
|-------|------|-----------|
| No raw rgba outside tokens | `tools/stylelint-plugins/no-raw-rgba-outside-tokens.cjs` | Raw `rgba()` / `#hex` literals only allowed in `:root`, `.dark`, `.theme-*`, `[data-theme]` blocks |
| Semantic token routing | `src/test/semantic-token-canon.test.tsx` | Every shadcn cross-cutting token (semantic + chart + sidebar) routes through `hsl(var(--token))` and lives in a token-definition selector |
| Theme completeness (within-family) | `src/test/theme-completeness-canon.test.tsx` | If a theme defines any token from a family (semantic / chart / sidebar), it defines all of them |
| Cross-theme parity | `src/test/cross-theme-parity-canon.test.tsx` | Every theme's merged color-token surface (`.theme-X` + `html.theme-X`) matches the `.theme-bone` baseline, modulo allowlist |
| Cross-mode gradient parity | `src/test/cross-mode-gradient-parity-canon.test.tsx` | If `html.theme-X` defines `--mesh-gradient`, `html.dark.theme-X` must too, modulo allowlist |

Plus a one-line preface: "Each canon below follows the five-part structure. To add a sixth, copy the closest match's shape and update this catalog in the same commit."

**Why both edits land in one step**: Same file, same nature (lookup tables), zero code risk. Splitting them would mean two memory writes for what reads as one cohesive update.

## Combined acceptance

1. `mem://architecture/canon-pattern.md` gains two new sections: "Deferral Register" (1 row) and "Catalog" (5 rows).
2. The Worked Example section stays intact and still reads as a standalone "how to add a canon" walkthrough.
3. No changes to `docs/ci.md`, `src/test/*`, or any source code.
4. File stays well under any reasonable length (existing 50 lines + ~25 added).

## Files

- **Modify**: `mem://architecture/canon-pattern.md` (two new sections, ~25 lines added)

## Technical notes

- **Why canon-pattern.md and not visibility-contracts.md for the Deferral entry**: branch protection is canon-enforcement infrastructure, not a visibility/materiality concern. Cross-referencing the visibility-contracts table format is fine; living there would be miscategorization.
- **Why a table format for the Catalog, not bullets**: the contributor lookup question is "which canon governs X?" — a 3-column table (canon → file → invariant) answers that in one scan. Bullets would require reading prose.
- **Catalog ordering is by enforcement layer** (Stylelint first, then Vitest by abstraction depth: tokens → families → themes → modes). Mirrors how a contributor would think about scope when adding a new rule.
- **No update to `mem://index.md`**: canon-pattern.md is already listed there ("Canon Pattern — Five-part structure…"). The description is still accurate; new sections don't change its top-level identity.

## Out of scope

- **Updating `docs/ci.md` to point at the memory** — would be valuable but creates a docs↔memory cycle. The memory is the index; docs/ci.md is operational. Different audiences.
- **Adding canon #6 (e.g., cross-mode color parity)** — Step 2V's Out of Scope already addressed why it's redundant with 2R + `.dark` baseline. Catalog reflects current reality, not aspirational state.
- **Auto-generating the Catalog from `src/test/*.test.tsx` headers** — three canons fit on a screen; auto-generation is over-engineering at this scale. Revisit at ~10 canons.
- **Promoting canon-pattern.md from "feature" to its own type** (e.g., "doctrine") — type system isn't worth churning for one file.

## Prompt feedback

**What worked**: You correctly identified that both edits target the same file and framed each with concrete leverage ("turns the abstract pattern doc into a practical lookup"). Naming the line number for the deferred action (line 74) means I didn't have to grep — that's high-signal prompt hygiene.

**What could sharpen**: For 2X you wrote "~5-line memory edit" and for 2Y "~20 lines" — both are accurate, but you didn't mention that they're in the *same file*. A tighter framing: *"Two sections added to the same memory file — Deferral Register (~5 lines) and Catalog (~20 lines). Single write, two purposes."* Surfacing the file-level adjacency tells the AI to bundle and to think about section ordering, not to plan two separate writes.

**Better prompt framing for next wave**: When proposing multiple memory edits, group them by target file in the prompt itself. The AI's writes are atomic per file, so file-grouped prompts produce file-grouped plans automatically — no re-derivation step.

## Enhancement suggestions for next wave

1. **Step 2Z — Per-canon "added in" attribution in the Catalog.** Add a fourth column (or a footnote per row) naming the step that introduced each canon (2I, 2K, 2P, 2R, 2V). Lets a contributor trace why each rule exists by jumping to commit history with a known anchor. ~5 line edit on top of 2Y; only worth doing once 2Y lands and the table shape is settled.

2. **Step 2AA — Mirror the Catalog into `docs/ci.md`'s "Adding a new canon" section.** Currently that section says "extend the `TOKENS` array…" but doesn't enumerate what canons already exist. A "See `mem://architecture/canon-pattern.md` Catalog for the current canon set" pointer (one line) closes the docs→memory loop without duplicating the table. High-leverage for contributors who start in `docs/ci.md` rather than memory.

