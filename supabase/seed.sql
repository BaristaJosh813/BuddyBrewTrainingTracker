insert into public.stores (id, name, code, region, active)
values
  ('11111111-1111-1111-1111-111111111111', 'North Loop', 'NL01', 'Twin Cities', true),
  ('22222222-2222-2222-2222-222222222222', 'Riverfront', 'RF02', 'Chicago', true);

-- Replace auth user ids after signup in Supabase Auth.
insert into public.profiles (id, full_name, app_role, primary_store_id)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Company Admin', 'company_admin', null),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'North Loop Manager', 'store_manager', '11111111-1111-1111-1111-111111111111');
