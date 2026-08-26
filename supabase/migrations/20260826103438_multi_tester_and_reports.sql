-- Multiple testers per task, per-item "who changed this" attribution, a
-- task-level note, and submitted_by tracking for the generated report.

create table if not exists public.task_assignees (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tester_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (task_id, tester_id)
);

-- Carry over existing single-assignee tasks into the new join table.
insert into public.task_assignees (task_id, tester_id)
select id, assigned_to from public.tasks where assigned_to is not null
on conflict do nothing;

alter table public.task_assignees enable row level security;

create policy "fullstack admin manages task_assignees" on public.task_assignees for all
  to authenticated using (public.is_fullstack_admin()) with check (public.is_fullstack_admin());

create policy "tester reads own assignments" on public.task_assignees for select
  to authenticated using (tester_id = auth.uid());

-- Replace every assigned_to-based policy with a task_assignees membership
-- check BEFORE dropping the assigned_to column itself — Postgres won't let
-- you drop a column while a policy still references it.
drop policy if exists "tester reads own tasks" on public.tasks;
create policy "tester reads own tasks" on public.tasks for select
  to authenticated using (
    deleted_at is null
    and exists (select 1 from public.task_assignees ta where ta.task_id = tasks.id and ta.tester_id = auth.uid())
  );

drop policy if exists "tester updates own open task_items" on public.task_items;
drop policy if exists "tester updates own task_items" on public.task_items;
create policy "tester updates own task_items" on public.task_items for update
  to authenticated using (
    exists (
      select 1 from public.tasks t
      join public.task_assignees ta on ta.task_id = t.id
      where t.id = task_items.task_id and ta.tester_id = auth.uid() and t.deleted_at is null
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      join public.task_assignees ta on ta.task_id = t.id
      where t.id = task_items.task_id and ta.tester_id = auth.uid() and t.deleted_at is null
    )
  );

drop policy if exists "tester reads own task_items" on public.task_items;
create policy "tester reads own task_items" on public.task_items for select
  to authenticated using (
    exists (
      select 1 from public.tasks t
      join public.task_assignees ta on ta.task_id = t.id
      where t.id = task_items.task_id and ta.tester_id = auth.uid() and t.deleted_at is null
    )
  );

drop policy if exists "tester uploads own task-evidence" on storage.objects;
create policy "tester uploads own task-evidence" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'task-evidence'
    and exists (
      select 1 from public.tasks t
      join public.task_assignees ta on ta.task_id = t.id
      where ta.tester_id = auth.uid()
        and t.deleted_at is null
        and split_part(name, '/', 1) = t.id::text
    )
  );

-- Now safe to drop — nothing references it any more.
alter table public.tasks drop column if exists assigned_to;

alter table public.tasks add column if not exists additional_note text not null default '';
alter table public.tasks add column if not exists submitted_by uuid references public.profiles(id);

alter table public.task_items add column if not exists updated_by uuid references public.profiles(id);

create or replace function public.set_task_item_updated_by()
returns trigger
language plpgsql
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists set_task_item_updated_by on public.task_items;
create trigger set_task_item_updated_by
  before update on public.task_items
  for each row execute function public.set_task_item_updated_by();

-- Any assigned tester may submit once every item is checked.
create or replace function public.submit_task(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_assignee boolean;
  v_unchecked_count int;
begin
  select exists (
    select 1 from public.task_assignees where task_id = p_task_id and tester_id = auth.uid()
  ) into v_is_assignee;

  if not v_is_assignee then
    raise exception 'Not authorized to submit this task';
  end if;

  select count(*) into v_unchecked_count
  from public.task_items
  where task_id = p_task_id and not checked;

  if v_unchecked_count > 0 then
    raise exception 'All checklist items must be checked before submitting';
  end if;

  update public.tasks set submitted_at = now(), submitted_by = auth.uid() where id = p_task_id;
end;
$$;

-- Allow a tester to update their task's additional_note (only, and only
-- while it isn't trashed) without opening up the rest of the row.
create or replace function public.update_task_note(p_task_id uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_assignee boolean;
begin
  select exists (
    select 1 from public.task_assignees ta
    join public.tasks t on t.id = ta.task_id
    where ta.task_id = p_task_id and ta.tester_id = auth.uid() and t.deleted_at is null
  ) into v_is_assignee;

  if not v_is_assignee then
    raise exception 'Not authorized to edit this task';
  end if;

  update public.tasks set additional_note = p_note where id = p_task_id;
end;
$$;
