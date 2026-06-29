# First Admin Setup Guide

After registering a normal account, follow these steps to promote yourself to **System Administrator**.

---

## Step 1: Register a Normal Account

1. Go to your live app: **[https://msu-zs-inventory.vercel.app/register](https://msu-zs-inventory.vercel.app/register)**
2. Fill in your **First Name, Last Name, Email, Student Number, and Password**
3. Click **"Create Account"**
4. Check your email and verify your account (if email confirmation is enabled)

> **Note:** You will register as **Student Cadet** by default. We'll promote you to admin in the next step.

---

## Step 2: Promote Yourself to System Administrator

### Option A: Supabase SQL Editor (Recommended)

1. Go to your **Supabase Dashboard**: [https://supabase.com/dashboard/project/pcvqgpfpighxzdcjggnn](https://supabase.com/dashboard/project/pcvqgpfpighxzdcjggnn)
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. **Paste this SQL** (replace `your.email@msuzs-rotc.edu.ph` with your actual email):

```sql
-- Promote user to System Administrator
update public.profiles
set
  role = 'system_administrator',
  is_approved = true,
  updated_at = now()
where email = 'your.email@msuzs-rotc.edu.ph';

-- Check if it worked
select id, email, role, is_approved, is_active
from public.profiles
where email = 'your.email@msuzs-rotc.edu.ph';
```

5. Click **"Run"**
6. You should see your profile with `role = system_administrator` and `is_approved = true`

### Option B: Find your User ID first

If you don't know your email, you can find all users:

```sql
-- List all registered users
select id, email, role, is_approved, is_active, created_at
from public.profiles
order by created_at desc;
```

Then promote by ID:

```sql
update public.profiles
set
  role = 'system_administrator',
  is_approved = true,
  updated_at = now()
where id = 'your-uuid-here';
```

---

## Step 3: Configure Auth Settings

In your Supabase Dashboard, update the redirect URLs for production:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://msu-zs-inventory.vercel.app`
3. In **Redirect URLs**, add:
   ```
   https://msu-zs-inventory.vercel.app/auth/callback
   https://msu-zs-inventory.vercel.app/*
   ```
4. Click **"Save"**

---

## Step 4: Log In as Admin

1. Go to your live app: **[https://msu-zs-inventory.vercel.app/login](https://msu-zs-inventory.vercel.app/login)**
2. Sign in with your email and password
3. You should now see **full admin access** including:
   - ✅ **Users** — Approve new accounts, change roles, activate/deactivate
   - ✅ **Audit Trail** — View all system activity
   - ✅ **System Settings** — Configure penalties, borrow limits, etc.
   - ✅ **Reports & Analytics** — Full access to all data insights

---

## Managing Other Users

As System Administrator, you can:

1. **Approve new users** — Go to **Users** page, click the green checkmark on unapproved accounts
2. **Change roles** — Click the gear icon on any user to promote them (e.g., to Supply Officer, ROTC Commandant, etc.)
3. **Activate/Deactivate** — Toggle user access with the red/green buttons
4. **View audit logs** — See every action across the system in **Audit Trail**

---

## Need Help?

If you encounter any issues, check the Supabase SQL Editor console for error messages, or contact the system developer.
