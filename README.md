# Buddy Brew Coffee Training Tracker

A Buddy Brew Coffee training dashboard built for Supabase-backed RBAC, cafe-scoped visibility, and a 180-day automated barista roadmap.

## Stack

- Next.js App Router with TypeScript
- Supabase Auth + Postgres
- Supabase RLS for tenant-aware access control
- Responsive craft-coffee UI tuned for tablets and bright bar environments

## Features

- Unlimited `stores` growth with no hardcoded location cap
- `company_admin` and `store_manager` roles backed by Supabase Auth profiles
- Multi-store manager assignments so one leader can oversee more than one cafe
- Strict RLS on `stores`, `profiles`, `employees`, `employee_private_details`, `certifications`, and `milestone_adjustments`
- Sensitive employee data isolated in `employee_private_details`, visible only to admins
- 180-day roadmap milestones generated automatically from `hire_date`
- Company heat map, academy queue, store roster, employee training card, and admin tools
- Milestone snooze / fast-track auditing with required reason capture

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Apply the schema in Supabase SQL Editor or with the Supabase CLI:

```bash
supabase db push
```

5. Optionally apply [`supabase/seed.sql`](/Users/joshthomas/Desktop/BBC%20ai%20Projects/supabase/seed.sql) after replacing the placeholder auth user IDs.

6. Start the app:

```bash
npm run dev
```

## Security Model

- `company_admin` has global read/write access.
- `store_manager` can only read and update employees and certifications tied to cafes assigned in `manager_store_assignments`.
- `profiles.primary_store_id` remains the manager's default landing cafe when they manage more than one location.
- Managers can create milestone adjustments only for certifications attached to employees in their assigned cafes.
- Private employee details live in a separate table so managers never query sensitive columns.
- Supabase keys are only read from environment variables. The service role key is only used in server-side admin actions.

## Manager Setup

- Apply the latest migration in [`supabase/migrations/202603250002_manager_multi_store_auth.sql`](/Users/joshthomas/Desktop/BBC%20ai%20Projects/supabase/migrations/202603250002_manager_multi_store_auth.sql).
- Sign in as a `company_admin` and use the Admin page to create a manager login with an initial password.
- Choose one or more assigned cafes for that manager. Their default cafe is saved separately from the full assignment list.
- Managers sign in at `/login` and only see the cafes, employees, and certifications allowed by RLS.

## Schema Notes

- Core relational tables: `stores`, `employees`, `certifications`
- Supporting security / audit tables: `profiles`, `employee_private_details`, `milestone_adjustments`
- `employees` automatically seed the full training roadmap on insert, including a BOH-first or Cashier-first path based on `starting_position`.
- Orientation auto-completes on hire date.

## Verification

`npm run build` completes successfully in this environment.
