
create or replace function public.recovery_sla_stats(p_org uuid)
returns table (
  open_count integer,
  contacted_count integer,
  resolved_count integer,
  breached_count integer,
  avg_first_contact_hours numeric,
  avg_resolution_hours numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(_user_id => auth.uid(), _org_id => p_org) then
    return;
  end if;

  return query
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
end;
$$;
