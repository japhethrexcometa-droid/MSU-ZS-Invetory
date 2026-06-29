-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00003: Simplify to 2 roles (Logistics Officer + ROTC Officer)
-- Login via Student ID (stored as email@rotc.msuzs.local format)
-- =============================================================

-- 1. Change user_role enum from 7 roles → 2 roles
-- PostgreSQL can't remove enum values, so we create a new type and migrate
create type user_role_v2 as enum ('logistics_officer', 'rotc_officer');

-- Update profiles column to use new type
alter table public.profiles
  alter column role type user_role_v2
  using (
    case
      when role in ('system_administrator', 'rotc_commandant', 'supply_officer', 'logistics_officer') then 'logistics_officer'::text
      else 'rotc_officer'::text
    end
  )::user_role_v2;

-- Drop old type
drop type user_role;

-- Rename new type
alter type user_role_v2 rename to user_role;

-- Update default
alter table public.profiles
  alter column role set default 'rotc_officer'::user_role;

-- 2. UPDATE: handle_new_user trigger to default to rotc_officer and not auto-approve
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    contact_number,
    student_number,
    role,
    is_approved,
    is_active
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'contact_number',
    new.raw_user_meta_data ->> 'student_number',
    'rotc_officer',  -- Always register as ROTC Officer
    false,            -- Requires Logistics Officer approval
    true              -- Active by default
  );
  return new;
end;
$$;

-- 3. UPDATE RLS policies for 2-role system

-- Drop old policies
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admin can manage all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;
drop policy if exists "Supply officers and admins can insert assets" on public.assets;
drop policy if exists "Supply officers and admins can update assets" on public.assets;
drop policy if exists "Officers can view all borrows" on public.borrow_transactions;
drop policy if exists "Officers can view all lost reports" on public.lost_reports;
drop policy if exists "Only admins can view audit logs" on public.audit_logs;

-- Profiles: Logistics Officer can see and manage all profiles
create policy "Logistics Officer can view all profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

create policy "Logistics Officer can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

create policy "Logistics Officer can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

-- Assets: Logistics Officer can insert/update; ROTC Officer can view
create policy "Logistics Officer can insert assets"
  on public.assets for insert
  with check (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

create policy "Logistics Officer can update assets"
  on public.assets for update
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

-- Borrow: All authenticated can view relevant borrows
create policy "Officers can view all borrows"
  on public.borrow_transactions for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('logistics_officer', 'rotc_officer')
    )
  );

-- Lost reports: All officers can view all lost reports
create policy "Officers can view all lost reports"
  on public.lost_reports for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('logistics_officer', 'rotc_officer')
    )
  );

-- Audit logs: Only Logistics Officer can view
create policy "Logistics Officer can view audit logs"
  on public.audit_logs for select
  using (
    exists (
      select 1 from public.profiles where id = auth.uid() and role = 'logistics_officer'
    )
  );

-- 4. Add function to check if a user is approved (for login gate)
create or replace function public.is_user_approved(p_user_id uuid)
returns boolean
language sql
security definer
as $$
  select coalesce(
    (select is_approved from public.profiles where id = p_user_id),
    false
  );
$$;
