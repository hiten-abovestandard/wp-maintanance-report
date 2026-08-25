-- Bootstrap the two department admins. Idempotent — safe to re-run any time
-- (e.g. after creating pm@abovestandard.dk's auth user, which must exist first
-- for their row to attach).

insert into public.profiles (id, email, department, role)
select id, email, 'wordpress', 'admin'
from auth.users
where email = 'hc@abovestandard.dk'
on conflict (id) do update set
  department = excluded.department,
  role = excluded.role,
  blocked = false;

insert into public.profiles (id, email, department, role)
select id, email, 'fullstack', 'admin'
from auth.users
where email = 'pm@abovestandard.dk'
on conflict (id) do update set
  department = excluded.department,
  role = excluded.role,
  blocked = false;
