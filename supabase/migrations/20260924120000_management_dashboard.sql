-- Management Dashboard: CEO-facing task tracking, independent of the
-- wordpress/fullstack department domains. Members are real auth accounts
-- (department='management', role='member') purely so tasks can reference
-- profiles.id and pull name/email for digest emails — they get no
-- client-side screens of their own in this phase.

alter table public.profiles drop constraint if exists profiles_department_check;
alter table public.profiles add constraint profiles_department_check
  check (department in ('wordpress', 'fullstack', 'management'));

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'tester', 'member'));

alter table public.profiles add column if not exists name text;

-- Any admin, regardless of department, manages the Management Dashboard.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not blocked
  );
$$;

create table if not exists public.mgmt_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  expected_delivery_date date not null,
  expected_delivery_time time,
  image_url text,
  cowork_link text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Notification overrides: null means "use the priority default".
  notify_morning boolean,
  notify_evening boolean,
  notify_start_date date,
  notify_repeat boolean,
  notify_max_count int,
  notify_stop_on_complete boolean not null default true,
  notify_sent_count int not null default 0
);

create index if not exists mgmt_tasks_expected_delivery_date_idx on public.mgmt_tasks (expected_delivery_date);
create index if not exists mgmt_tasks_status_idx on public.mgmt_tasks (status);

drop trigger if exists set_updated_at on public.mgmt_tasks;
create trigger set_updated_at
  before update on public.mgmt_tasks
  for each row execute function public.set_updated_at();

create or replace function public.mgmt_set_task_timestamps()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'in_progress' and old.status = 'pending' and new.started_at is null then
    new.started_at = now();
  end if;
  if new.status = 'completed' and new.completed_at is null then
    new.completed_at = now();
  end if;
  if new.status <> 'completed' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists mgmt_set_task_timestamps on public.mgmt_tasks;
create trigger mgmt_set_task_timestamps
  before update on public.mgmt_tasks
  for each row execute function public.mgmt_set_task_timestamps();

create table if not exists public.mgmt_task_assignees (
  task_id uuid not null references public.mgmt_tasks(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, member_id)
);

create table if not exists public.mgmt_fyi_recipients (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mgmt_settings (
  id boolean primary key default true check (id),
  morning_send_time time not null default '08:00',
  evening_send_time time not null default '18:00',
  timezone text not null default 'Europe/Copenhagen'
);
insert into public.mgmt_settings (id) values (true) on conflict do nothing;

create table if not exists public.mgmt_digest_log (
  id uuid primary key default gen_random_uuid(),
  cycle text not null check (cycle in ('morning', 'evening')),
  sent_on date not null,
  sent_at timestamptz not null default now(),
  task_count int not null default 0,
  recipient_count int not null default 0,
  unique (cycle, sent_on)
);

alter table public.mgmt_tasks enable row level security;
alter table public.mgmt_task_assignees enable row level security;
alter table public.mgmt_fyi_recipients enable row level security;
alter table public.mgmt_settings enable row level security;
alter table public.mgmt_digest_log enable row level security;

create policy "admin manages mgmt_tasks" on public.mgmt_tasks for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin manages mgmt_task_assignees" on public.mgmt_task_assignees for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin manages mgmt_fyi_recipients" on public.mgmt_fyi_recipients for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin manages mgmt_settings" on public.mgmt_settings for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin reads mgmt_digest_log" on public.mgmt_digest_log for select
  to authenticated using (public.is_admin());

-- profiles: admins (any department) need to read/manage management members too.
create policy "admin reads all profiles" on public.profiles for select
  to authenticated using (public.is_admin());

create policy "admin manages profiles" on public.profiles for insert
  to authenticated with check (public.is_admin());

create policy "admin updates profiles" on public.profiles for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin deletes profiles" on public.profiles for delete
  to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('management-task-images', 'management-task-images', true)
on conflict (id) do nothing;

create policy "public read management-task-images" on storage.objects for select
  to public using (bucket_id = 'management-task-images');

create policy "admin manages management-task-images" on storage.objects for all
  to authenticated using (bucket_id = 'management-task-images' and public.is_admin())
  with check (bucket_id = 'management-task-images' and public.is_admin());
