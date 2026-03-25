create table public.manager_store_assignments (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (manager_id, store_id)
);

grant select, insert, update, delete on public.manager_store_assignments to authenticated;

alter table public.manager_store_assignments enable row level security;

create or replace function public.user_manages_store(target_store_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.current_app_role() = 'company_admin'
    or exists (
      select 1
      from public.manager_store_assignments msa
      where msa.manager_id = auth.uid()
        and msa.store_id = target_store_id
    )
$$;

drop policy if exists "managers can view primary store" on public.stores;

create policy "managers can view assigned stores"
on public.stores
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and public.user_manages_store(id)
);

drop policy if exists "managers can read update store employees" on public.employees;
drop policy if exists "managers can update store employees" on public.employees;

create policy "managers can read assigned store employees"
on public.employees
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and public.user_manages_store(primary_store_id)
);

create policy "managers can update assigned store employees"
on public.employees
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and public.user_manages_store(primary_store_id)
)
with check (
  public.current_app_role() = 'store_manager'
  and public.user_manages_store(primary_store_id)
);

drop policy if exists "managers can read update certifications in their store" on public.certifications;
drop policy if exists "managers can update certifications in their store" on public.certifications;

create policy "managers can read certifications in assigned stores"
on public.certifications
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and public.user_manages_store(e.primary_store_id)
  )
);

create policy "managers can update certifications in assigned stores"
on public.certifications
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and public.user_manages_store(e.primary_store_id)
  )
)
with check (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and public.user_manages_store(e.primary_store_id)
  )
);

drop policy if exists "managers can create read store milestone adjustments" on public.milestone_adjustments;
drop policy if exists "managers can create store milestone adjustments" on public.milestone_adjustments;

create policy "managers can read milestone adjustments in assigned stores"
on public.milestone_adjustments
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.certifications c
    join public.employees e on e.id = c.employee_id
    where c.id = milestone_adjustments.certification_id
      and public.user_manages_store(e.primary_store_id)
  )
);

create policy "managers can create milestone adjustments in assigned stores"
on public.milestone_adjustments
for insert
to authenticated
with check (
  public.current_app_role() = 'store_manager'
  and adjusted_by = auth.uid()
  and exists (
    select 1
    from public.certifications c
    join public.employees e on e.id = c.employee_id
    where c.id = milestone_adjustments.certification_id
      and public.user_manages_store(e.primary_store_id)
  )
);

create policy "admins can manage manager store assignments"
on public.manager_store_assignments
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "managers can view own store assignments"
on public.manager_store_assignments
for select
to authenticated
using (manager_id = auth.uid());
