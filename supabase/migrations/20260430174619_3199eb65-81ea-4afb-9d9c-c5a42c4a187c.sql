-- Allow site_settings.value to be NULL.
--
-- Doctrine: `value` represents the LIVE-PUBLISHED payload. Until an
-- operator clicks Publish, a freshly-created draft has no live value.
-- Forcing value NOT NULL meant first-ever drafts had to be seeded into
-- live too, which leaks unpublished work onto the public site.
--
-- After this change:
--   value = null         → never published; public site renders nothing
--                          for this row, editor still sees draft_value
--   value = jsonb(...)   → last-published payload; public site reads this
--   draft_value          → editor's in-progress / saved-but-unpublished
ALTER TABLE public.site_settings
  ALTER COLUMN value DROP NOT NULL;