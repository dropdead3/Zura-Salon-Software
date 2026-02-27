

## Fix Specialties and Highlighted Services Flow

The current implementation caps **Specialties** at 3, which is wrong. The intended flow is:

1. **Specialties** — select freely from the full list of 10 (no cap, or a higher cap like 10)
2. **Highlighted Services** — from your selected specialties, pick 2-3 to feature on the website card

### Changes — `src/pages/dashboard/MyProfile.tsx`

**1. Remove the 3-specialty cap in `toggleSpecialty` (lines 394-398)**
- Remove the `if (prev.specialties.length >= 3)` guard so stylists can select as many specialties as apply to them

**2. Update the Specialties label (line 1154)**
- Change `"(select 2-3 required)"` to something like `"(select all that apply)"` since specialties are no longer capped at 3

**3. Update the counter text (lines 1189-1195)**
- Change the `{formData.specialties.length}/3 selected` counter to just `{formData.specialties.length} selected`
- Remove the "Please select at least 2 specialties" validation text (or keep a minimum of 1)

**4. Update the disabled logic for specialty buttons (line 1160)**
- Remove `const isDisabled = !isSelected && formData.specialties.length >= 3;` — no cap means never disabled

**5. Highlighted Services stays as-is** — already correctly limited to 3 and sourced from `formData.specialties`

