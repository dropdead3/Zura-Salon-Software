
-- 1) Recovery SLA aggregate RPC -------------------------------------------------
create or replace function public.recovery_sla_stats(p_org uuid)
returns table (
  open_count integer,
  contacted_count integer,
  resolved_count integer,
  breached_count integer,
  avg_first_contact_hours numeric,
  avg_resolution_hours numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with snoozed_clear as (
    select * from public.recovery_tasks
    where organization_id = p_org
      and (snoozed_until is null or snoozed_until <= now())
  ),
  sample as (
    select created_at, first_contacted_at, resolved_at
    from public.recovery_tasks
    where organization_id = p_org
      and status in ('resolved','refunded','redo_booked','closed')
      and resolved_at is not null
    order by resolved_at desc
    limit 200
  )
  select
    (select count(*)::int from snoozed_clear where status = 'new'),
    (select count(*)::int from snoozed_clear where status = 'contacted'),
    (select count(*)::int from public.recovery_tasks
       where organization_id = p_org
         and status in ('resolved','refunded','redo_booked','closed')),
    (select count(*)::int from snoozed_clear
       where status = 'new'
         and created_at < now() - interval '24 hours'
         and first_contacted_at is null),
    (select round(avg(extract(epoch from (first_contacted_at - created_at)) / 3600)::numeric, 1)
       from sample where first_contacted_at is not null),
    (select round(avg(extract(epoch from (resolved_at - created_at)) / 3600)::numeric, 1)
       from sample where resolved_at is not null);
$$;

revoke all on function public.recovery_sla_stats(uuid) from public;
grant execute on function public.recovery_sla_stats(uuid) to authenticated;

-- 2) Dispatcher tick observability ---------------------------------------------
create table if not exists public.dispatch_tick_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  enqueued integer not null default 0,
  sent integer not null default 0,
  skipped integer not null default 0,
  errors integer not null default 0,
  enqueue_orgs_served integer not null default 0,
  enqueue_max_per_org integer not null default 0,
  enqueue_capped_orgs integer not null default 0,
  send_orgs_served integer not null default 0,
  send_max_per_org integer not null default 0,
  send_capped_orgs integer not null default 0,
  duration_ms integer
);

create index if not exists idx_dispatch_tick_log_ran_at on public.dispatch_tick_log (ran_at desc);

alter table public.dispatch_tick_log enable row level security;

-- Platform staff can read for dashboards; service role bypasses RLS for writes.
create policy "Platform users can view dispatch tick log"
  on public.dispatch_tick_log
  for select
  to authenticated
  using (public.is_platform_user(auth.uid()));
