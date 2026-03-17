
-- =============================================================
-- One-time dedup: merge size-variant duplicates, then strengthen index
-- =============================================================

-- Step 1: Identify duplicates — keep the newest, soft-delete older ones
WITH base_names AS (
  SELECT
    id,
    organization_id,
    brand,
    name,
    is_backroom_tracked,
    created_at,
    lower(regexp_replace(name, '\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$', '', 'i')) AS base_name,
    ROW_NUMBER() OVER (
      PARTITION BY organization_id, lower(brand),
        lower(regexp_replace(name, '\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$', '', 'i'))
      ORDER BY created_at DESC
    ) AS rn
  FROM public.products
  WHERE is_active = true
),
survivors AS (
  SELECT id AS survivor_id, organization_id, base_name
  FROM base_names WHERE rn = 1
),
victims AS (
  SELECT b.id AS victim_id, s.survivor_id
  FROM base_names b
  JOIN survivors s
    ON s.organization_id = b.organization_id
   AND s.base_name = lower(regexp_replace(b.name, '\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$', '', 'i'))
   AND lower(b.brand) = (
     SELECT lower(p.brand) FROM public.products p WHERE p.id = s.survivor_id
   )
  WHERE b.rn > 1
),

-- Step 2: Merge tracking state (if victim was tracked, ensure survivor is too)
merge_tracking AS (
  UPDATE public.products p
  SET is_backroom_tracked = true
  FROM victims v
  WHERE p.id = v.survivor_id
    AND EXISTS (
      SELECT 1 FROM public.products vp
      WHERE vp.id = v.victim_id AND vp.is_backroom_tracked = true
    )
  RETURNING p.id
),

-- Step 3: Transfer stock_movements references
transfer_movements AS (
  UPDATE public.stock_movements sm
  SET product_id = v.survivor_id
  FROM victims v
  WHERE sm.product_id = v.victim_id
  RETURNING sm.id
),

-- Step 4: Transfer inventory_projections — delete victim projections after merging
delete_victim_projections AS (
  DELETE FROM public.inventory_projections ip
  USING victims v
  WHERE ip.product_id = v.victim_id
  RETURNING ip.id
),

-- Step 5: Soft-delete the victims
soft_delete AS (
  UPDATE public.products p
  SET is_active = false, updated_at = now()
  FROM victims v
  WHERE p.id = v.victim_id
  RETURNING p.id
)

SELECT count(*) AS deduped FROM soft_delete;

-- Step 6: Rebuild projections for affected survivors
-- (handled by the existing trigger on stock_movements or manual rebuild)

-- Step 7: Drop old index and create normalized unique index
DROP INDEX IF EXISTS public.idx_products_org_brand_name_unique;

CREATE UNIQUE INDEX idx_products_org_brand_basename_unique
  ON public.products (
    organization_id,
    lower(brand),
    lower(regexp_replace(name, '\s*[—–-]\s*\d+\.?\d*\s*(g|ml|oz|L|l)\s*$', '', 'i'))
  )
  WHERE is_active = true;
