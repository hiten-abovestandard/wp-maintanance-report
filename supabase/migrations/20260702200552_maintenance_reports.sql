create extension if not exists pgcrypto;

create table if not exists public.maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_reports_report_date_idx
  on public.maintenance_reports (report_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.maintenance_reports;
create trigger set_updated_at
  before update on public.maintenance_reports
  for each row execute function public.set_updated_at();

alter table public.maintenance_reports enable row level security;

create policy "authenticated can read reports"
  on public.maintenance_reports for select
  to authenticated
  using (true);

create policy "authenticated can insert reports"
  on public.maintenance_reports for insert
  to authenticated
  with check (true);

create policy "authenticated can update reports"
  on public.maintenance_reports for update
  to authenticated
  using (true)
  with check (true);

create policy "authenticated can delete reports"
  on public.maintenance_reports for delete
  to authenticated
  using (true);
