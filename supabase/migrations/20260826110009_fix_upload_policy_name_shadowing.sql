-- The tester upload policy's WITH CHECK referenced a bare `name`, which
-- Postgres resolved to the inner subquery's `tasks.name` (task title) instead
-- of the intended `storage.objects.name` (the uploaded file's path) — the two
-- almost never matched, so every tester upload was silently rejected.
-- Qualifying it fixes the shadowing.

drop policy if exists "tester uploads own task-evidence" on storage.objects;
create policy "tester uploads own task-evidence" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'task-evidence'
    and exists (
      select 1 from public.tasks t
      join public.task_assignees ta on ta.task_id = t.id
      where ta.tester_id = auth.uid()
        and t.deleted_at is null
        and split_part(storage.objects.name, '/', 1) = t.id::text
    )
  );
