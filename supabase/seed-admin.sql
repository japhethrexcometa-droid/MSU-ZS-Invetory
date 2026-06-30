-- Promote Existing Account to Logistics Officer (S-4)
-- Replace 'your.email@msubuug.edu.ph' with your actual email
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Find your account by email
select id, email, student_number, first_name, last_name, role, is_approved, is_active
from public.profiles
where email = 'japhethrex.cometa@msubuug.edu.ph';

-- Step 2: Promote to Logistics Officer (S-4) and approve
update public.profiles
set
  role = 'logistics_officer',
  is_approved = true,
  approved_at = now(),
  updated_at = now()
where email = 'japhethrex.cometa@msubuug.edu.ph';

-- Step 3: Confirm the promotion
select id, email, student_number, first_name, last_name, role, is_approved, is_active
from public.profiles
where email = 'japhethrex.cometa@msubuug.edu.ph';
