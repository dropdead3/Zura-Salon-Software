
-- Add Task Engine 2.0 columns to tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS opportunity_id UUID REFERENCES public.capital_funding_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revenue_type TEXT,
  ADD COLUMN IF NOT EXISTS priority_score INTEGER,
  ADD COLUMN IF NOT EXISTS execution_time_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS difficulty_score INTEGER,
  ADD COLUMN IF NOT EXISTS task_type TEXT,
  ADD COLUMN IF NOT EXISTS enforcement_level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS decay_days INTEGER,
  ADD COLUMN IF NOT EXISTS missed_revenue_cents INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- Index for priority-based sorting
CREATE INDEX IF NOT EXISTS idx_tasks_priority_score ON public.tasks(priority_score DESC NULLS LAST);

-- Index for opportunity linkage lookups
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity_id ON public.tasks(opportunity_id) WHERE opportunity_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
