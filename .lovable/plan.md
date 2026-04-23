

# Theme palette refresh: 4 refined + 4 new for broader taste range

## Diagnosis

You currently ship 8 themes (Zura, Cream, Rose, Sage, Ocean, Ember, Noir, Neon) defined in two coordinated files:

- **`src/hooks/useColorTheme.ts`** — registry, names, descriptions, swatch previews shown on the Appearance card.
- **`src/index.css`** — full HSL token sets per theme (light + dark), including primary, background, sidebar, card surfaces, and 5 chart colors.

Looking at the current set with fresh eyes against "beautiful options for different tastes":

**What's working:** Zura (signature violet), Noir (timeless mono), Neon (high-energy), Sage (calm green) cover four distinct emotional registers well.

**What's underwhelming:**
- **Cream** — the description says "warm cream & oat" but the primary (`hsl(0 0% 8%)`) is just black. Reads as an off-white Noir, not a warm hospitality palette. No identity.
- **Rose** — the swatch reads as a muted dusty pink. Pleasant but indistinct from "soft beauty salon" cliché. Could be more elevated.
- **Ocean** — generic SaaS blue. Doesn't feel premium against the rest of the lineup.
- **Ember** — the orange is loud (`hsl(25 80% 50%)`) and doesn't feel "warm amber" so much as "construction cone." Needs to be deepened toward bourbon/cognac.

**What's missing from the taste spectrum:**
- A **deep luxury jewel tone** (emerald or sapphire — feels like a private members' club, not a SaaS dashboard)
- A **soft bone/stone neutral** (Cream done right — warm, hospitality-grade, with a real accent color, not a mono in disguise)
- A **bold editorial palette** (think art-house magazine — saturated but sophisticated)
- A **calm clinical/spa palette** (soft seafoam or sky — for operators who want zero visual stimulation)

## What changes

### Final 8-theme lineup

| # | Theme | Identity | Primary | Personality |
|---|---|---|---|---|
| 1 | **Zura** | Brand violet & purple | `270 70% 55%` | Signature — keep as-is |
| 2 | **Bone** *(refined Cream)* | Warm bone & cognac | `28 55% 42%` cognac brown | Hospitality / boutique hotel |
| 3 | **Rosewood** *(refined Rose)* | Rich rose & burgundy | `345 55% 42%` deep rose | Editorial femininity, elevated |
| 4 | **Sage** | Calming mint green | `145 45% 42%` | Keep — already good |
| 5 | **Marine** *(refined Ocean)* | Deep navy & gold | `218 65% 35%` deep navy | Premium / Bloomberg-terminal feel |
| 6 | **Cognac** *(refined Ember)* | Bourbon amber | `28 70% 42%` deeper amber | Warm leather, whiskey bar |
| 7 | **Noir** | Pure monochrome minimal | `0 0% 8%` | Keep as-is |
| 8 | **Neon** | Hot pink & black | `330 95% 55%` | Keep as-is |

This refines 4 (Cream → Bone, Rose → Rosewood, Ocean → Marine, Ember → Cognac) and keeps 4 (Zura, Sage, Noir, Neon). All names stay short. Total count stays at 8 so the Appearance grid still renders as 4×2.

### Why this set covers the taste spectrum

| Taste profile | Theme |
|---|---|
| Brand-loyal (default) | Zura |
| Warm hospitality / spa | Bone |
| Editorial / feminine luxury | Rosewood |
| Clean / wellness / calm | Sage |
| Premium / executive / financial | Marine |
| Warm masculine / boutique salon | Cognac |
| Minimalist / architectural | Noir |
| High-energy / fashion / nightlife | Neon |

Every operator persona (independent stylist, salon owner, multi-location, enterprise exec) finds at least one palette that resonates.

### Files to edit

**1. `src/hooks/useColorTheme.ts`**
- Update `ColorTheme` type union: `'cream' → 'bone'`, `'rose' → 'rosewood'`, `'ocean' → 'marine'`, `'ember' → 'cognac'`.
- Update `ALL_THEMES` array.
- Update `colorThemes` registry (id, name, description, light/dark swatch previews).
- Update `COLOR_THEME_TO_CATEGORY_MAP` for the renamed keys.
- Add a one-time **localStorage migration**: if a user has the old key (`'cream'`, `'rose'`, `'ocean'`, `'ember'`) saved, transparently migrate to the new key on read so they don't get reset to Zura.

**2. `src/index.css`**
- Rename `.theme-cream` / `.dark.theme-cream` → `.theme-bone` / `.dark.theme-bone` and replace the token set with a real cognac-accented bone palette (warm bg, brown primary, gold-ish chart-2).
- Rename `.theme-rose` → `.theme-rosewood` and deepen the primary toward burgundy (`345 55% 42%`), keep the soft pink wash on backgrounds.
- Rename `.theme-ocean` → `.theme-marine`, deepen primary to navy (`218 65% 35%`), add a gold accent to chart-4.
- Rename `.theme-ember` → `.theme-cognac`, pull the primary back from bright orange toward a deeper amber (`28 70% 42%`), warm the bg slightly.
- Leave `.theme-zura`, `.theme-sage`, `.theme-noir`, `.theme-neon` token sets untouched.

**3. Database site_settings migration (one statement)**
Update existing `site_settings` rows where `key = 'org_color_theme'` and `value->>'theme'` is one of the renamed values. Map: `cream → bone`, `rose → rosewood`, `ocean → marine`, `ember → cognac`. So orgs that picked one of those themes don't silently snap back to Zura on next load.

## Acceptance

1. Appearance card on `/dashboard/admin/settings?category=appearance` (and any other surface that renders the theme grid) shows 8 themes: **Zura, Bone, Rosewood, Sage, Marine, Cognac, Noir, Neon** in 4×2 layout.
2. Clicking each theme switches the dashboard live, persists to `site_settings`, and survives refresh.
3. Existing orgs that previously picked Cream / Rose / Ocean / Ember are silently migrated to Bone / Rosewood / Marine / Cognac (their selection is preserved, the new palette renders).
4. Existing localStorage values for the old theme keys are silently migrated on next load (no flash to Zura).
5. All 8 themes render correctly in both light and dark mode across: sidebar, top nav, KPI cards, charts, badges, drilldown dialogs, God Mode bar.
6. Chart colors in each theme remain readable (pass WCAG AA on backgrounds).
7. Type-check passes — every reference to the old `ColorTheme` literal types compiles.

## What stays untouched

- 8-theme count, grid layout, theme-switcher UX.
- Per-user dark/light mode persistence (previous wave).
- God Mode bar, glass morphism, scroll-to-top behavior — all unaffected.
- Custom theme system (`custom_theme` in `user_preferences`) — unrelated path.
- Public-site / marketing-site colors — unrelated path.
- Zura, Sage, Noir, Neon palettes — all four kept exactly as-is.

## Out of scope

- Adding a **9th–12th** theme. Defer — 8 is already a comfortable choice ceiling. If demand emerges for "dark gold" or "matte black with copper," add later.
- A **per-location** theme override. Defer — themes are org-scoped today; per-location is a separate doctrine question.
- Letting the user **author custom palettes** through the UI. Defer — the `custom_theme` JSONB column already supports it, but exposing a builder is a separate wave.
- Animating between themes (cross-fade). Defer — instant swap is the expected behavior and matches every other dashboard preference.

## Doctrine alignment

- **Brand abstraction layer:** the renamed themes (Bone, Rosewood, Marine, Cognac) are evocative-but-neutral words — they describe a *feeling*, not a tenant. Same naming register as Sage, Noir, Neon. No tenant-specific references introduced.
- **Calm executive UX:** the refinements pull every theme toward the "premium chrome over loud accent" register. Marine and Cognac specifically address the gap where the previous Ocean and Ember felt SaaS-generic.
- **Persona scaling:** the refreshed taste spectrum gives every operator persona at least one palette that resonates without forcing solo stylists into enterprise navy or vice versa.

## Prompt feedback

Strong prompt — three things you did right:

1. **You opened the door to refining existing themes ("Im okay if we edit current themes as well to improve them").** That removed a huge constraint — without it I'd have been stuck adding new themes alongside weaker existing ones, fragmenting the taste spectrum. Allowing edits let me upgrade the underwhelming 4 instead of just stacking more on top.
2. **You named the goal in taste-language ("beautiful theme options for different tastes"), not in technical-language ("more colors").** That framed the work as a design judgment ("which tastes are missing?") rather than a quantity problem ("add 4 more").
3. **You included the screenshot.** I could see the current Appearance grid layout (4×2) and confirm the theme order, swatch shape, and description format — so the refresh fits the existing chrome instead of forcing a UI redesign.

Sharpener: when asking for a curated set ("more options"), naming the **target count** and the **dimensions of variety you care about** removes two decisions. Template:

```text
Surface: [where the options live]
Goal: [what variety should cover]
Target count: [keep at N / expand to N / no preference]
Dimensions: [the axes of variety — e.g., "warm vs cool, bold vs calm, masculine vs feminine"]
```

Here, "keep the count at 8, but cover warm vs cool, bold vs calm, and masculine vs feminine across the set" would have skipped my having to derive the taste spectrum from scratch. I picked 8 (kept the count) and the four-axis spectrum (hospitality / editorial / executive / minimalist) by inferring from the current lineup — but you naming it would have anchored me faster.

## Further enhancement suggestion

For "curate a set of options" prompts, the highest-leverage frame is:

```text
Surface: [where the set lives]
Goal: [the variety / coverage you want]
Count: [keep / expand / contract]
Coverage axes: [the dimensions the set should span]
Constraints: [what cannot change — e.g., "names must stay one word," "must work in dark mode"]
```

The **Coverage axes** slot is the highest-leverage addition for taste-driven curation — it forces the framing "we want a *spread* across these dimensions" instead of "we want more options." Naming the axes (warm/cool, bold/calm, masculine/feminine, editorial/clinical) means I'm picking palettes that *fill gaps* rather than picking palettes that *feel nice in isolation*. For a theme system specifically, the axes are usually 3: emotional temperature, saturation level, and persona resonance — naming any one of those upfront cuts the design space in half.

