create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on public.companies to authenticated;

alter table public.companies enable row level security;

alter table public.profiles add column company_id uuid references public.companies(id) on delete restrict;
alter table public.stores add column company_id uuid references public.companies(id) on delete restrict;
alter table public.employees add column company_id uuid references public.companies(id) on delete restrict;
alter table public.manager_store_assignments add column company_id uuid references public.companies(id) on delete restrict;

do $$
declare
  default_company_id uuid := gen_random_uuid();
begin
  insert into public.companies (id, name)
  values (default_company_id, 'Buddy Brew');

  update public.profiles set company_id = default_company_id where company_id is null;
  update public.stores set company_id = default_company_id where company_id is null;
  update public.employees set company_id = default_company_id where company_id is null;
  update public.manager_store_assignments set company_id = default_company_id where company_id is null;
end
$$;

alter table public.profiles alter column company_id set not null;
alter table public.stores alter column company_id set not null;
alter table public.employees alter column company_id set not null;
alter table public.manager_store_assignments alter column company_id set not null;

create or replace function public.current_company_id()
returns uuid
language sql
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.user_manages_store(target_store_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.stores s
    where s.id = target_store_id
      and s.company_id = public.current_company_id()
      and (
        public.current_app_role() = 'company_admin'
        or exists (
          select 1
          from public.manager_store_assignments msa
          where msa.manager_id = auth.uid()
            and msa.store_id = target_store_id
            and msa.company_id = public.current_company_id()
        )
      )
  )
$$;

drop policy if exists "admins can manage stores" on public.stores;
create policy "admins can manage stores"
on public.stores
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
)
with check (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
);

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "admins can manage profiles" on public.profiles;
create policy "admins can manage profiles"
on public.profiles
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
)
with check (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
);

drop policy if exists "admins can manage employees" on public.employees;
create policy "admins can manage employees"
on public.employees
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
)
with check (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
);

drop policy if exists "admins only private details" on public.employee_private_details;
create policy "admins only private details"
on public.employee_private_details
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.employees e
    where e.id = employee_private_details.employee_id
      and e.company_id = public.current_company_id()
  )
)
with check (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.employees e
    where e.id = employee_private_details.employee_id
      and e.company_id = public.current_company_id()
  )
);

drop policy if exists "admins can manage certifications" on public.certifications;
create policy "admins can manage certifications"
on public.certifications
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and e.company_id = public.current_company_id()
  )
)
with check (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and e.company_id = public.current_company_id()
  )
);

drop policy if exists "admins can manage milestone adjustments" on public.milestone_adjustments;
create policy "admins can manage milestone adjustments"
on public.milestone_adjustments
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.certifications c
    join public.employees e on e.id = c.employee_id
    where c.id = milestone_adjustments.certification_id
      and e.company_id = public.current_company_id()
  )
)
with check (
  public.current_app_role() = 'company_admin'
  and exists (
    select 1
    from public.certifications c
    join public.employees e on e.id = c.employee_id
    where c.id = milestone_adjustments.certification_id
      and e.company_id = public.current_company_id()
  )
);

drop policy if exists "admins can manage manager store assignments" on public.manager_store_assignments;
create policy "admins can manage manager store assignments"
on public.manager_store_assignments
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
)
with check (
  public.current_app_role() = 'company_admin'
  and company_id = public.current_company_id()
);

drop policy if exists "managers can view own store assignments" on public.manager_store_assignments;
create policy "managers can view own store assignments"
on public.manager_store_assignments
for select
to authenticated
using (
  manager_id = auth.uid()
  and company_id = public.current_company_id()
);

create policy "admins can manage companies"
on public.companies
for all
to authenticated
using (
  public.current_app_role() = 'company_admin'
  and id = public.current_company_id()
)
with check (
  public.current_app_role() = 'company_admin'
  and id = public.current_company_id()
);
