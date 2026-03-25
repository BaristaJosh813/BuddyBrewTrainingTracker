create type public.training_start_position as enum ('boh', 'cashier');

alter table public.employees
add column starting_position public.training_start_position not null default 'boh';

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
    (
      new.id,
      case when new.starting_position = 'cashier' then 'cashier_training' else 'boh_training' end,
      new.hire_date + 7,
      null,
      'pending',
      false
    ),
    (
      new.id,
      case when new.starting_position = 'cashier' then 'boh_training' else 'academy_session_1' end,
      new.hire_date + 14,
      null,
      'pending',
      false
    ),
    (
      new.id,
      case when new.starting_position = 'cashier' then 'academy_session_1' else 'cashier_training' end,
      new.hire_date + 21,
      null,
      'pending',
      false
    ),
    (new.id, 'floor_support_proficiency', new.hire_date + 60, null, 'pending', false),
    (new.id, 'academy_session_2', new.hire_date + 90, null, 'pending', false),
    (new.id, 'academy_session_3', new.hire_date + 165, null, 'pending', false),
    (new.id, 'barista_graduation', new.hire_date + 180, null, 'pending', false);
  return new;
end;
$$;

update public.certifications c
set milestone_key = 'boh_training',
    due_date = e.hire_date + 7
from public.employees e
where c.employee_id = e.id
  and c.milestone_key = 'boh_cashier_checkin'
  and e.starting_position = 'boh';

update public.certifications c
set milestone_key = 'cashier_training',
    due_date = e.hire_date + 7
from public.employees e
where c.employee_id = e.id
  and c.milestone_key = 'boh_cashier_checkin'
  and e.starting_position = 'cashier';

update public.certifications c
set due_date = e.hire_date + 14
from public.employees e
where c.employee_id = e.id
  and c.milestone_key = 'academy_session_1'
  and e.starting_position = 'boh';

insert into public.certifications (employee_id, milestone_key, due_date, completed_at, status, waiting_for_academy)
select
  e.id,
  'cashier_training',
  e.hire_date + 21,
  null,
  'pending',
  false
from public.employees e
where e.starting_position = 'boh'
  and not exists (
    select 1
    from public.certifications c
    where c.employee_id = e.id
      and c.milestone_key = 'cashier_training'
  );

insert into public.certifications (employee_id, milestone_key, due_date, completed_at, status, waiting_for_academy)
select
  e.id,
  'boh_training',
  e.hire_date + 14,
  null,
  'pending',
  false
from public.employees e
where e.starting_position = 'cashier'
  and not exists (
    select 1
    from public.certifications c
    where c.employee_id = e.id
      and c.milestone_key = 'boh_training'
  );

drop view if exists public.manager_employee_directory;

create view public.manager_employee_directory
with (security_invoker = true)
as
select
  e.id,
  e.primary_store_id,
  e.first_name,
  e.last_name,
  e.role_title,
  e.hire_date,
  e.starting_position,
  e.active,
  e.latte_heart,
  e.latte_rosetta,
  e.latte_tulip,
  e.milk_whole,
  e.milk_skim,
  e.milk_almond,
  e.milk_oat
from public.employees e;
