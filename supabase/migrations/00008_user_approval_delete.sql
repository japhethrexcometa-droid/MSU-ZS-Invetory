-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00008: User Approval, Rejection & Deletion
-- =============================================================

-- 1. RECREATE handle_new_user function with better error handling
-- This ensures profile is always created when a user registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_first_name text;
  v_last_name text;
  v_student_number text;
  v_contact_number text;
begin
  -- Use metadata values if available, otherwise use auth values
  v_email := coalesce(
    new.raw_user_meta_data ->> 'email',
    new.email,
    ''
  );
  v_first_name := coalesce(
    new.raw_user_meta_data ->> 'first_name',
    ''
  );
  v_last_name := coalesce(
    new.raw_user_meta_data ->> 'last_name',
    ''
  );
  v_student_number := new.raw_user_meta_data ->> 'student_number';
  v_contact_number := new.raw_user_meta_data ->> 'contact_number';

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
    v_email,
    v_first_name,
    v_last_name,
    v_contact_number,
    v_student_number,
    'rotc_officer',  -- Always register as ROTC Officer
    false,            -- Requires Logistics Officer approval
    true              -- Active by default (pending approval)
  );
  return new;
exception when others then
  -- Log the error but don't fail the user creation
  raise warning 'handle_new_user error for user %: %', new.id, SQLERRM;
  return new;
end;
$$;

-- Drop and recreate the trigger to make sure it's attached
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. FUNCTION: Helper to check if a user is active (approved AND not deactivated)
create or replace function public.is_user_active(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_active boolean;
  v_approved boolean;
begin
  select is_active, is_approved into v_active, v_approved
  from public.profiles
  where id = p_user_id;

  return coalesce(v_active, false) AND coalesce(v_approved, false);
end;
$$;

-- 3. FUNCTION: Deactivate/delete a user (admin use only)
create or replace function public.deactivate_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set
    is_active = false,
    updated_at = now()
  where id = p_target_user_id;
end;
$$;

-- 4. Ensure RLS policies allow logistics officers to manage all user states
-- These should already exist from migration 00006, but just to be safe:
drop policy if exists "Users can view own profile or Logistics Officer can view all" on public.profiles;

create policy "Users can view own profile or Logistics Officer can view all"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_logistics_officer(auth.uid())
  );

-- 5. FUNCTION: Check if user is deleted/deactivated (for login gate)
create or replace function public.is_user_deactivated(p_user_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_active boolean;
begin
  select is_active into v_active
  from public.profiles
  where id = p_user_id;

  return coalesce(v_active, true) = false;
end;
$$;
