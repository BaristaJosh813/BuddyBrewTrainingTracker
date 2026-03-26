drop policy if exists "managers can view assigned stores" on public.stores;
create policy "managers can view assigned stores"
on public.stores
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and company_id = public.current_company_id()
  and exists (
    select 1
    from public.manager_store_assignments msa
    where msa.manager_id = auth.uid()
      and msa.store_id = stores.id
      and msa.company_id = public.current_company_id()
  )
);

drop policy if exists "managers can read assigned store employees" on public.employees;
create policy "managers can read assigned store employees"
on public.employees
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and company_id = public.current_company_id()
  and exists (
    select 1
    from public.manager_store_assignments msa
    where msa.manager_id = auth.uid()
      and msa.store_id = employees.primary_store_id
      and msa.company_id = public.current_company_id()
  )
);

drop policy if exists "managers can update assigned store employees" on public.employees;
create policy "managers can update assigned store employees"
on public.employees
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and company_id = public.current_company_id()
  and exists (
    select 1
    from public.manager_store_assignments msa
    where msa.manager_id = auth.uid()
      and msa.store_id = employees.primary_store_id
      and msa.company_id = public.current_company_id()
  )
)
with check (
  public.current_app_role() = 'store_manager'
  and company_id = public.current_company_id()
  and exists (
    select 1
    from public.manager_store_assignments msa
    where msa.manager_id = auth.uid()
      and msa.store_id = employees.primary_store_id
      and msa.company_id = public.current_company_id()
  )
);

drop policy if exists "managers can read certifications in assigned stores" on public.certifications;
create policy "managers can read certifications in assigned stores"
on public.certifications
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    join public.manager_store_assignments msa
      on msa.store_id = e.primary_store_id
     and msa.company_id = e.company_id
    where e.id = certifications.employee_id
      and e.company_id = public.current_company_id()
      and msa.manager_id = auth.uid()
  )
);

drop policy if exists "managers can update certifications in assigned stores" on public.certifications;
create policy "managers can update certifications in assigned stores"
on public.certifications
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    join public.manager_store_assignments msa
      on msa.store_id = e.primary_store_id
     and msa.company_id = e.company_id
    where e.id = certifications.employee_id
      and e.company_id = public.current_company_id()
      and msa.manager_id = auth.uid()
  )
)
with check (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    join public.manager_store_assignments msa
      on msa.store_id = e.primary_store_id
     and msa.company_id = e.company_id
    where e.id = certifications.employee_id
      and e.company_id = public.current_company_id()
      and msa.manager_id = auth.uid()
  )
);

drop policy if exists "managers can read milestone adjustments in assigned stores" on public.milestone_adjustments;
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
    join public.manager_store_assignments msa
      on msa.store_id = e.primary_store_id
     and msa.company_id = e.company_id
    where c.id = milestone_adjustments.certification_id
      and e.company_id = public.current_company_id()
      and msa.manager_id = auth.uid()
  )
);

drop policy if exists "managers can create milestone adjustments in assigned stores" on public.milestone_adjustments;
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
    join public.manager_store_assignments msa
      on msa.store_id = e.primary_store_id
     and msa.company_id = e.company_id
    where c.id = milestone_adjustments.certification_id
      and e.company_id = public.current_company_id()
      and msa.manager_id = auth.uid()
  )
);
