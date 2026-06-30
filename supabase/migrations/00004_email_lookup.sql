-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00004: Email lookup function + remove synthetic email dependency
-- =============================================================

-- 1. FUNCTION: Look up email by student number (bypasses RLS via security definer)
-- Used by the login page to find the auth email when user logs in with Student ID
create or replace function public.get_email_by_student_number(p_student_number text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select email from public.profiles
  where student_number = p_student_number
  limit 1;
$$;

-- 2. FUNCTION: Look up profile ID by student number (for auth flow)
create or replace function public.get_profile_id_by_student_number(p_student_number text)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from public.profiles
  where student_number = p_student_number
  limit 1;
$$;

-- 3. Update the handle_new_user trigger to use the actual email from user_metadata
-- instead of the auth email (which could be the synthetic format)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  -- Use the email from user_metadata if available, otherwise use auth email
  v_email := coalesce(
    new.raw_user_meta_data ->> 'email',
    new.email
  );

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
    coalesce(new.raw_user_meta_data ->> 'first_name', ''),
    coalesce(new.raw_user_meta_data ->> 'last_name', ''),
    new.raw_user_meta_data ->> 'contact_number',
    new.raw_user_meta_data ->> 'student_number',
    'rotc_officer',
    false,
    true
  );
  return new;
end;
$$;
