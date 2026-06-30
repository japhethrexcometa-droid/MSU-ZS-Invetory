-- Seed Logistics Officer (S-4) Account
-- Student ID: admin, Password: admin123
-- Run this in Supabase Dashboard → SQL Editor

-- Check if account already exists
do $$
declare
  user_id uuid;
begin
  -- Check if already exists
  select id into user_id from auth.users where email = 'admin@rotc.msuzs.local';

  if user_id is null then
    -- Create the auth user
    user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      user_id,
      'authenticated',
      'authenticated',
      'admin@rotc.msuzs.local',
      crypt('admin123', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email'],
        'first_name', 'System',
        'last_name', 'Administrator',
        'student_number', 'admin'
      ),
      jsonb_build_object(
        'first_name', 'System',
        'last_name', 'Administrator',
        'student_number', 'admin'
      ),
      now(),
      now(),
      '', '', '', ''
    );

    -- Create the profile with full access
    insert into public.profiles (
      id, student_number, first_name, last_name, email,
      role, is_approved, is_active, approved_at, created_at, updated_at
    ) values (
      user_id,
      'admin',
      'System',
      'Administrator',
      'admin@rotc.msuzs.local',
      'logistics_officer',
      true,
      true,
      now(),
      now(),
      now()
    );

    raise notice '✅ Logistics Officer (S-4) account created!';
    raise notice '   Student ID: admin';
    raise notice '   Password: admin123';
  else
    -- Update existing account to ensure it has correct role
    update public.profiles set
      role = 'logistics_officer',
      is_approved = true,
      is_active = true
    where id = user_id;

    raise notice '✅ Existing account updated to Logistics Officer (S-4)';
    raise notice '   Student ID: admin';
    raise notice '   Password: admin123 (reset via app if needed)';
  end if;
end;
$$;
