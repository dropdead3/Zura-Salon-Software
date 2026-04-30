ALTER TABLE public.promotion_redemptions
  ADD COLUMN IF NOT EXISTS surface text NOT NULL DEFAULT 'unknown';

-- Backfill: any redemption already in the table predates the column so it
-- could have come from any surface. We mark them 'unknown' (the column
-- default) to preserve the per-surface honesty of future filtering — we'd
-- rather under-count the popup than over-count it with rows we can't prove.
-- Rows written from this migration onward will be stamped explicitly by the
-- edge function (e.g. 'promotional_popup', and later 'campaign', 'qr', …).

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_org_surface
  ON public.promotion_redemptions(organization_id, surface, transaction_date DESC);