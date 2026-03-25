insert into public.companies (id, name)
values ('99999999-9999-9999-9999-999999999999', 'Buddy Brew');

insert into public.stores (id, company_id, name, code, region, active)
values
  ('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999', 'North Loop', 'NL01', 'Twin Cities', true),
  ('22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'Riverfront', 'RF02', 'Chicago', true);

-- Replace auth user ids after signup in Supabase Auth.
insert into public.profiles (id, company_id, full_name, app_role, primary_store_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-9999-9999-9999-999999999999', 'Company Admin', 'company_admin', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'North Loop Manager', 'store_manager', '11111111-1111-1111-1111-111111111111');
