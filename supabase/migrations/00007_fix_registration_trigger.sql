-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00007: Ensure handle_new_user trigger exists and works
-- =============================================================

-- Recreate the handle_new_user function
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

-- Drop and recreate the trigger to make sure it's attached
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
