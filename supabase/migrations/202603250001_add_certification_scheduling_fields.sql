alter table public.certifications
add column scheduled boolean not null default false,
add column scheduled_for date;
