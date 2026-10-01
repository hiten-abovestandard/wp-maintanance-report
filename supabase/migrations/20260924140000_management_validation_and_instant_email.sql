-- Enforce email uniqueness at the DB layer (final safety net behind the
-- application-level pre-checks in managementApi.js), and add a log table so
-- instant + scheduled task emails share one audit trail.

alter table public.profiles drop constraint if exists profiles_email_unique;
alter table public.profiles add constraint profiles_email_unique unique (email);

create table if not exists public.mgmt_task_email_log (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.mgmt_tasks(id) on delete cascade,
  sent_by uuid references public.profiles(id),
  sent_at timestamptz not null default now(),
  recipients text[] not null default '{}',
  email_type text not null default 'instant' check (email_type in ('instant', 'scheduled')),
  status text not null check (status in ('sent', 'failed')),
  error text
);

create index if not exists mgmt_task_email_log_task_id_idx on public.mgmt_task_email_log (task_id, sent_at desc);

alter table public.mgmt_task_email_log enable row level security;

create policy "admin manages mgmt_task_email_log" on public.mgmt_task_email_log for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
