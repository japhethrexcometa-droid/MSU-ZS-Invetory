-- =============================================================
-- MSU-ZS ROTC Inventory System
-- FINAL Admin Setup: Logistics Officer (S-4)
-- Student ID: admin  |  Password: admin123
-- Email: japhethrex.cometa@msubuug.edu.ph
-- =============================================================
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- No password hashing — only fixes email confirmation + profile.
-- =============================================================

-- 1. Check current state
select '--- AUTH USER ---' as info;
select id, email, email_confirmed_at is not null as email_confirmed
from auth.users
where email = 'japhethrex.cometa@msubuug.edu.ph';

select '--- PROFILE ---' as info;
select id, student_number, email, role, is_approved, is_active
from public.profiles
where email = 'japhethrex.cometa@msubuug.edu.ph'
   or student_number = 'admin';

-- 2. Confirm the email (no password changes — just a timestamp)
update auth.users
set email_confirmed_at = now()
where email = 'japhethrex.cometa@msubuug.edu.ph';

-- 3. Ensure profile exists and is correct
insert into public.profiles (id, student_number, first_name, last_name, email, role, is_approved, is_active, approved_at, created_at, updated_at)
select
  id,
  'admin',
  'System',
  'Administrator',
  'japhethrex.cometa@msubuug.edu.ph',
  'logistics_officer',
  true,
  true,
  now(),
  now(),
  now()
from auth.users
where email = 'japhethrex.cometa@msubuug.edu.ph'
  and id not in (select id from public.profiles)
on conflict (id) do update set
  student_number = 'admin',
  role = 'logistics_officer',
  is_approved = true,
  is_active = true,
  updated_at = now();

-- 4. Final verification
select '--- VERIFICATION ---' as info;
select
  u.email,
  p.student_number,
  p.role,
  p.is_approved,
  u.email_confirmed_at is not null as email_confirmed
from auth.users u
left join public.profiles p on p.id = u.id
where u.email = 'japhethrex.cometa@msubuug.edu.ph';
