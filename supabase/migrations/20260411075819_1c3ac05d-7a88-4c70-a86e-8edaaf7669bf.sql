-- Extend expansion_opportunity_type enum with new Zura Capital types
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'capacity_expansion';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'inventory_expansion';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'service_growth';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'stylist_capacity_growth';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'campaign_acceleration';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'equipment_expansion';
ALTER TYPE public.expansion_opportunity_type ADD VALUE IF NOT EXISTS 'marketing_acceleration';

-- Extend expansion_status enum with Zura Capital statuses
ALTER TYPE public.expansion_status ADD VALUE IF NOT EXISTS 'funded';
ALTER TYPE public.expansion_status ADD VALUE IF NOT EXISTS 'surfaced';
ALTER TYPE public.expansion_status ADD VALUE IF NOT EXISTS 'underperforming';
ALTER TYPE public.expansion_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE public.expansion_status ADD VALUE IF NOT EXISTS 'canceled';

-- Extend financed_project_status enum
ALTER TYPE public.financed_project_status ADD VALUE IF NOT EXISTS 'underperforming';