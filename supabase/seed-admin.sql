-- =============================================================
-- MSU-ZS ROTC Inventory System
-- First-Time Admin Setup: Logistics Officer (S-4)
-- Student ID: admin  |  Password: admin123
-- Email: admin@s4.msu-zs-rotc.ph
-- =============================================================
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- after your project is deployed and migrations are applied.
-- =============================================================

do $$
declare
  v_user_id uuid;
  v_email text := 'admin@s4.msu-zs-rotc.ph';
  v_student_number text := 'admin';
begin
  -- Check if an admin already exists (by student_number or email)
  select p.id into v_user_id
  from public.profiles p
  where p.student_number = v_student_number
     or p.email = v_email
  limit 1;

  if v_user_id is not null then
    -- Admin exists — just ensure correct role and approval
    update public.profiles
    set role = 'logistics_officer',
        is_approved = true,
        is_active = true,
        approved_at = now(),
        updated_at = now()
    where id = v_user_id;

    raise notice '✅ Existing account updated to Logistics Officer (S-4)';
    raise notice '   Student ID: admin';
    raise notice '   Password: admin123 (or existing password if changed)';
  else
    -- Create fresh auth user (trigger auto-creates profile)
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role,
      email, encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt('admin123', gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email']
      ),
      jsonb_build_object(
        'first_name', 'System',
        'last_name', 'Administrator',
        'student_number', v_student_number,
        'email', v_email
      ),
      now(), now(),
      '', '', '', ''
    );

    -- Update the auto-created profile to Logistics Officer
    update public.profiles
    set role = 'logistics_officer',
        is_approved = true,
        is_active = true,
        approved_at = now(),
        updated_at = now()
    where id = v_user_id;

    raise notice '✅ Logistics Officer (S-4) account created!';
    raise notice '   Student ID: admin';
    raise notice '   Password: admin123';
  end if;
end;
$$;

-- Verify
select p.student_number, p.email, p.role, p.is_approved, p.is_active
from public.profiles p
where p.student_number = 'admin'
   or p.email = 'admin@s4.msu-zs-rotc.ph';
