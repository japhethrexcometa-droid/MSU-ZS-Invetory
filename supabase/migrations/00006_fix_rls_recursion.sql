-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00006: Fix Infinite Recursion in RLS Policies
-- =============================================================

-- 1. Create SECURITY DEFINER functions to check user roles without triggering RLS
create or replace function public.is_logistics_officer(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'logistics_officer'
  );
$$;

create or replace function public.is_rotc_officer_or_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('logistics_officer', 'rotc_officer')
  );
$$;

-- 2. Fix policies on `profiles`
drop policy if exists "Logistics Officer can view all profiles" on public.profiles;
drop policy if exists "Logistics Officer can insert profiles" on public.profiles;
drop policy if exists "Logistics Officer can update any profile" on public.profiles;
drop policy if exists "Users can view own profile or Logistics Officer can view all" on public.profiles;

create policy "Users can view own profile or Logistics Officer can view all"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_logistics_officer(auth.uid())
  );

create policy "Logistics Officer can insert profiles"
  on public.profiles for insert
  with check (public.is_logistics_officer(auth.uid()));

create policy "Logistics Officer can update any profile"
  on public.profiles for update
  using (public.is_logistics_officer(auth.uid()));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. Fix policies on `assets`
drop policy if exists "Logistics Officer can insert assets" on public.assets;
drop policy if exists "Logistics Officer can update assets" on public.assets;

create policy "Logistics Officer can insert assets"
  on public.assets for insert
  with check (public.is_logistics_officer(auth.uid()));

create policy "Logistics Officer can update assets"
  on public.assets for update
  using (public.is_logistics_officer(auth.uid()));

-- 4. Fix policies on `borrow_transactions`
drop policy if exists "Officers can view all borrows" on public.borrow_transactions;

create policy "Officers can view all borrows"
  on public.borrow_transactions for select
  using (public.is_rotc_officer_or_admin(auth.uid()));

-- 5. Fix policies on `lost_reports`
drop policy if exists "Officers can view all lost reports" on public.lost_reports;

create policy "Officers can view all lost reports"
  on public.lost_reports for select
  using (public.is_rotc_officer_or_admin(auth.uid()));

-- 6. Fix policies on `audit_logs`
drop policy if exists "Logistics Officer can view audit logs" on public.audit_logs;

create policy "Logistics Officer can view audit logs"
  on public.audit_logs for select
  using (public.is_logistics_officer(auth.uid()));
