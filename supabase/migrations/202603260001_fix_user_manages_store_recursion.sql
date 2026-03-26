create or replace function public.user_manages_store(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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
