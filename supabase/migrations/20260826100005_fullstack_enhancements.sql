-- Soft-delete (trash) for tasks, and unlock checklist editing after
-- submission for both the assigned tester and admins.

alter table public.tasks add column if not exists deleted_at timestamptz;

-- Removing a tester's profile previously failed with a foreign key violation
-- if they had any assigned task. Unassign their tasks instead of blocking
-- the removal.
alter table public.tasks drop constraint if exists tasks_assigned_to_fkey;
alter table public.tasks add constraint tasks_assigned_to_fkey
  foreign key (assigned_to) references public.profiles(id) on delete set null;

-- Tester can keep editing their task_items regardless of submission status
-- (a submitted task can still be corrected), but not once the task is trashed.
drop policy if exists "tester updates own open task_items" on public.task_items;
create policy "tester updates own task_items" on public.task_items for update
  to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid() and t.deleted_at is null
    )
  ) with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid() and t.deleted_at is null
    )
  );

-- Hide trashed tasks from the assigned tester.
drop policy if exists "tester reads own tasks" on public.tasks;
create policy "tester reads own tasks" on public.tasks for select
  to authenticated using (assigned_to = auth.uid() and deleted_at is null);

drop policy if exists "tester reads own task_items" on public.task_items;
create policy "tester reads own task_items" on public.task_items for select
  to authenticated using (
    exists (
      select 1 from public.tasks t
      where t.id = task_items.task_id and t.assigned_to = auth.uid() and t.deleted_at is null
    )
  );

-- Evidence uploads: allow uploading at any point (not just before
-- submission), for as long as the task isn't trashed. Switched from
-- storage.foldername(name) to split_part(name, '/', 1) — simpler and more
-- predictable for a single-level "<task_id>/<file>" path.
drop policy if exists "tester uploads own task-evidence" on storage.objects;
create policy "tester uploads own task-evidence" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'task-evidence'
    and exists (
      select 1 from public.tasks t
      where t.assigned_to = auth.uid()
        and t.deleted_at is null
        and split_part(name, '/', 1) = t.id::text
    )
  );
