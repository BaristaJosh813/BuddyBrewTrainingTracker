create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select app_role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_primary_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select primary_store_id from public.profiles where id = auth.uid()
$$;
