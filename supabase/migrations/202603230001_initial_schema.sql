create extension if not exists "pgcrypto";

create type public.app_role as enum ('company_admin', 'store_manager');
create type public.certification_status as enum ('pending', 'completed');

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  region text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  app_role public.app_role not null,
  primary_store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  primary_store_id uuid not null references public.stores(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  role_title text not null,
  hire_date date not null,
  active boolean not null default true,
  latte_heart boolean not null default false,
  latte_rosetta boolean not null default false,
  latte_tulip boolean not null default false,
  milk_whole boolean not null default false,
  milk_skim boolean not null default false,
  milk_almond boolean not null default false,
  milk_oat boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.employee_private_details (
  employee_id uuid primary key references public.employees(id) on delete cascade,
  personal_email text,
  phone text,
  emergency_contact text,
  notes text,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  milestone_key text not null,
  due_date date not null,
  completed_at date,
  status public.certification_status not null default 'pending',
  waiting_for_academy boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (employee_id, milestone_key)
);

create table public.milestone_adjustments (
  id uuid primary key default gen_random_uuid(),
  certification_id uuid not null references public.certifications(id) on delete cascade,
  adjusted_by uuid not null references public.profiles(id) on delete restrict,
  previous_due_date date not null,
  adjusted_due_date date not null,
  reason text not null check (char_length(trim(reason)) >= 5),
  created_at timestamptz not null default timezone('utc', now())
);

grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update, delete on public.employee_private_details to authenticated;
grant select, insert, update, delete on public.certifications to authenticated;
grant select, insert, update, delete on public.milestone_adjustments to authenticated;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select app_role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_primary_store_id()
returns uuid
language sql
stable
as $$
  select primary_store_id from public.profiles where id = auth.uid()
$$;

create or replace function public.seed_employee_certifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.certifications (employee_id, milestone_key, due_date, completed_at, status, waiting_for_academy)
  values
    (new.id, 'orientation', new.hire_date, new.hire_date, 'completed', false),
    (new.id, 'boh_cashier_checkin', new.hire_date + 14, null, 'pending', false),
    (new.id, 'academy_session_1', new.hire_date + 21, null, 'pending', false),
    (new.id, 'floor_support_proficiency', new.hire_date + 60, null, 'pending', false),
    (new.id, 'academy_session_2', new.hire_date + 90, null, 'pending', false),
    (new.id, 'academy_session_3', new.hire_date + 165, null, 'pending', false),
    (new.id, 'barista_graduation', new.hire_date + 180, null, 'pending', false);
  return new;
end;
$$;

create trigger on_employee_created_seed_certifications
after insert on public.employees
for each row execute procedure public.seed_employee_certifications();

create or replace view public.manager_employee_directory
with (security_invoker = true)
as
select
  e.id,
  e.primary_store_id,
  e.first_name,
  e.last_name,
  e.role_title,
  e.hire_date,
  e.active,
  e.latte_heart,
  e.latte_rosetta,
  e.latte_tulip,
  e.milk_whole,
  e.milk_skim,
  e.milk_almond,
  e.milk_oat
from public.employees e;

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.employee_private_details enable row level security;
alter table public.certifications enable row level security;
alter table public.milestone_adjustments enable row level security;

grant usage on schema public to authenticated;
grant select on public.manager_employee_directory to authenticated;

create policy "admins can manage stores"
on public.stores
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "managers can view primary store"
on public.stores
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and id = public.current_primary_store_id()
);

create policy "users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "admins can manage employees"
on public.employees
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "managers can read update store employees"
on public.employees
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and primary_store_id = public.current_primary_store_id()
);

create policy "managers can update store employees"
on public.employees
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and primary_store_id = public.current_primary_store_id()
)
with check (
  public.current_app_role() = 'store_manager'
  and primary_store_id = public.current_primary_store_id()
);

create policy "admins only private details"
on public.employee_private_details
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "admins can manage certifications"
on public.certifications
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "managers can read update certifications in their store"
on public.certifications
for select
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and e.primary_store_id = public.current_primary_store_id()
  )
);

create policy "managers can update certifications in their store"
on public.certifications
for update
to authenticated
using (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and e.primary_store_id = public.current_primary_store_id()
  )
)
with check (
  public.current_app_role() = 'store_manager'
  and exists (
    select 1
    from public.employees e
    where e.id = certifications.employee_id
      and e.primary_store_id = public.current_primary_store_id()
  )
);

create policy "admins can manage milestone adjustments"
on public.milestone_adjustments
for all
to authenticated
using (public.current_app_role() = 'company_admin')
with check (public.current_app_role() = 'company_admin');

create policy "managers can create read store milestone adjustments"
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
      and e.primary_store_id = public.current_primary_store_id()
  )
);

create policy "managers can create store milestone adjustments"
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
      and e.primary_store_id = public.current_primary_store_id()
  )
);
