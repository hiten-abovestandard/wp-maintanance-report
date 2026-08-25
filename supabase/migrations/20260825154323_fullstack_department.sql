-- Full-Stack department: profiles/roles, checklist groups & items, tasks, task item snapshots.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  department text not null check (department in ('wordpress', 'fullstack')),
  role text not null check (role in ('admin', 'tester')),
  blocked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.checklist_groups(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_group_id_idx on public.checklist_items (group_id, sort_order);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_id uuid references public.checklist_groups(id) on delete set null,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to);

create table if not exists public.task_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  checked boolean not null default false,
  comment text not null default '',
  image_url text,
  updated_at timestamptz not null default now()
);

create index if not exists task_items_task_id_idx on public.task_items (task_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.task_items;
create trigger set_updated_at
  before update on public.task_items
  for each row execute function public.set_updated_at();

-- Security-definer helper so RLS policies can check "is this caller a fullstack
-- admin" without a self-referencing policy on profiles recursing.
create or replace function public.is_fullstack_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and department = 'fullstack'
      and role = 'admin'
      and not blocked
  );
$$;

-- Server-side guard: a tester can only submit their own task, and only once
-- every item on it is checked. Runs as security definer so it can update a row
-- the tester's own RLS policy wouldn't otherwise allow past submission.
create or replace function public.submit_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assigned_to uuid;
  v_unchecked_count int;
begin
  select assigned_to into v_assigned_to from public.tasks where id = p_task_id;

  if v_assigned_to is null or v_assigned_to <> auth.uid() then
    raise exception 'Not authorized to submit this task';
  end if;

  select count(*) into v_unchecked_count
  from public.task_items
  where task_id = p_task_id and not checked;

  if v_unchecked_count > 0 then
    raise exception 'All checklist items must be checked before submitting';
  end if;

  update public.tasks set submitted_at = now() where id = p_task_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.checklist_groups enable row level security;
alter table public.checklist_items enable row level security;
alter table public.tasks enable row level security;
alter table public.task_items enable row level security;

-- profiles: everyone can read their own row (needed for login routing);
-- fullstack admins can read/manage all profiles (tester roster).
create policy "read own profile" on public.profiles for select
  to authenticated using (id = auth.uid());

create policy "fullstack admin reads all profiles" on public.profiles for select
  to authenticated using (public.is_fullstack_admin());

create policy "fullstack admin manages profiles" on public.profiles for insert
  to authenticated with check (public.is_fullstack_admin());

create policy "fullstack admin updates profiles" on public.profiles for update
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

create policy "fullstack admin deletes profiles" on public.profiles for delete
  to authenticated using (public.is_fullstack_admin());

-- checklist_groups / checklist_items: fullstack admin only.
create policy "fullstack admin manages checklist_groups" on public.checklist_groups for all
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

create policy "fullstack admin manages checklist_items" on public.checklist_items for all
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

-- tasks: fullstack admin full access; assigned tester can read their own tasks
-- and call submit_task() (which runs as security definer) but cannot edit the
-- task row directly.
create policy "fullstack admin manages tasks" on public.tasks for all
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

create policy "tester reads own tasks" on public.tasks for select
  to authenticated using (assigned_to = auth.uid());

-- task_items: fullstack admin full access; assigned tester can read/update
-- their own task's items while the task hasn't been submitted yet.
create policy "fullstack admin manages task_items" on public.task_items for all
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

create policy "tester reads own task_items" on public.task_items for select
  to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid()
    )
  );

create policy "tester updates own open task_items" on public.task_items for update
  to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid() and t.submitted_at is null
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid() and t.submitted_at is null
    )
  );

-- Storage bucket for optional per-item evidence photos.
insert into storage.buckets (id, name, public)
values ('task-evidence', 'task-evidence', true)
on conflict (id) do nothing;

create policy "public read task-evidence" on storage.objects for select
  to public using (bucket_id = 'task-evidence');

create policy "tester uploads own task-evidence" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'task-evidence'
    and exists (
      select 1 from public.tasks t
      where t.assigned_to = auth.uid()
        and t.submitted_at is null
        and (storage.foldername(name))[1] = t.id::text
    )
  );

create policy "fullstack admin manages task-evidence" on storage.objects for all
  to authenticated using (bucket_id = 'task-evidence' and public.is_fullstack_admin())
  with check (bucket_id = 'task-evidence' and public.is_fullstack_admin());
