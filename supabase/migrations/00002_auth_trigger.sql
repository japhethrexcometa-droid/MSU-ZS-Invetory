-- =============================================================
-- MSU-ZS ROTC Inventory System
-- Migration 00002: Auto-profile creation on signup + RLS fixes
-- =============================================================

-- 1. FUNCTION: Auto-create profile when user signs up
-- This runs automatically when a new user registers via Supabase Auth
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
    'student_cadet',  -- Always register as Student Cadet
    false,            -- Requires admin approval
    true              -- Active by default
  );
  return new;
end;
$$;

-- 2. TRIGGER: Fire on every new auth user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. FIX RLS: Allow profile creation during signup
-- The trigger function is security definer so it bypasses RLS.
-- But we also need this policy so that the service_role and 
-- admin operations can insert profiles directly if needed.
drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admin can manage all profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'system_administrator'
    )
  );

-- 4. FIX RLS: Allow users to update their own profile (name, contact, etc.)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- Users can NOT change their own role
    and (
      case
        when new.role is distinct from old.role then false
        else true
      end
    )
  );

-- 5. FIX RLS: Allow admins to update any profile (for role changes)
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role = 'system_administrator'
    )
  );
