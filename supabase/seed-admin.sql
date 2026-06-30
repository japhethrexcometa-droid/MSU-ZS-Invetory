-- =============================================================
-- MSU-ZS ROTC Inventory System
-- First-Time Admin Setup: Logistics Officer (S-4)
-- =============================================================
-- PREFERRED METHOD: Visit https://msu-zs-inventory.vercel.app/api/admin/seed
-- This uses the Supabase Auth Admin API (no manual hashing).
-- =============================================================
-- ALTERNATIVE (SQL):
-- This SQL only handles profile promotion if the auth user already exists.
-- It does NOT create auth users or handle password hashing.
-- =============================================================

-- Check if your account exists
select id, email, student_number, first_name, last_name, role, is_approved
from public.profiles
where email = 'japhethrex.cometa@msubuug.edu.ph';

-- Promote to Logistics Officer (S-4)
update public.profiles
set role = 'logistics_officer',
    is_approved = true,
    approved_at = now(),
    updated_at = now()
where email = 'japhethrex.cometa@msubuug.edu.ph';

-- Verify
select student_number, email, role, is_approved, is_active
from public.profiles
where email = 'japhethrex.cometa@msubuug.edu.ph';
