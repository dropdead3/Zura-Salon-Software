

## Remove Extensions Certified Toggle

Remove the `extensions_certified` toggle UI from both profile pages. The database column stays (harmless, avoids migration), but the UI and form logic references are removed.

### Changes

**File: `src/pages/dashboard/MyProfile.tsx`**
1. Remove the Extensions Certified UI block (lines 1260-1282) — the `<div className="pt-4 border-t">` section
2. Remove `extensions_certified: false` from initial formData state (line 155)
3. Remove `extensions_certified: profile.extensions_certified || false` from profile load (line 206)
4. Remove `extensions_certified: formData.extensions_certified` from save payload (line 345)

**File: `src/pages/dashboard/ViewProfile.tsx`**
1. Remove the Extensions Certified UI block (lines 833-847)
2. Remove `extensions_certified: false` from initial formData state (line 124)
3. Remove `extensions_certified: profile.extensions_certified || false` from profile load (line 169)
4. Remove `extensions_certified: formData.extensions_certified` from save payload (line 265)

No database migration needed — the column can remain unused.

