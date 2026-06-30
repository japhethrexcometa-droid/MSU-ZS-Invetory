# First Admin (Logistics Officer S-4) Setup Guide

After registering as a **ROTC Officer**, follow these steps to promote yourself to **Logistics Officer (S-4)** — the highest authority in the system.

The system now uses **2 roles only**:
- **Logistics Officer (S-4)** — Full access to everything (manage inventory, users, approvals, settings)
- **ROTC Officer** — Can borrow items, view inventory, report lost/damaged items

---

## Step 1: Register an Account

1. Go to your live app: **[https://msu-zs-inventory.vercel.app/register](https://msu-zs-inventory.vercel.app/register)**
2. Fill in:
   | Field | Example |
   |-------|---------|
   | First Name | `Juan` |
   | Last Name | `Dela Cruz` |
   | **Student ID Number** | `2024-00001` |
   | **Email (Gmail)** | `juandelacruz@gmail.com` |
   | Contact Number | `0917-123-4567` (optional) |
   | Password | `yourpassword` (min 8 chars) |
3. Click **"Create Account"**

> **Note:** You will register as **ROTC Officer** with `is_approved = false`. We'll promote you in the next step.
> **Login ID:** Your Student ID number (e.g., `2024-00001`)
> **Default password (if forgotten):** Your Student ID number
> **Password on approval:** When the Logistics Officer approves your account, your password is automatically reset to your Student ID number

---

## Step 2: Promote Yourself to Logistics Officer (S-4)

### Using Supabase SQL Editor

1. Go to your **Supabase Dashboard**: <a href="https://supabase.com/dashboard/project/pcvqgpfpighxzdcjggnn" target="_blank">https://supabase.com/dashboard/project/pcvqgpfpighxzdcjggnn</a>
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. **Paste this SQL** (replace `2024-00001` with your actual Student ID):

```sql
-- Verify your account exists
select id, email, role, is_approved, student_number, first_name, last_name
from public.profiles
where student_number = '2024-00001';

-- Promote to Logistics Officer (S-4) and approve
update public.profiles
set
  role = 'logistics_officer',
  is_approved = true,
  approved_at = now(),
  updated_at = now()
where student_number = '2024-00001';

-- Confirm the promotion
select id, email, role, is_approved, is_active
from public.profiles
where student_number = '2024-00001';
```

5. Click **"Run"**
6. You should see your profile with:
   - `role = logistics_officer` ✅
   - `is_approved = true` ✅

### Alternative: Find by User ID

```sql
-- List all registered users
select id, student_number, role, is_approved, first_name, last_name
from public.profiles
order by created_at desc;

-- Promote by ID
update public.profiles
set
  role = 'logistics_officer',
  is_approved = true,
  approved_at = now(),
  updated_at = now()
where id = 'your-uuid-here';
```

---

## Step 3: Log In as Logistics Officer (S-4)

1. Go to your live app: **[https://msu-zs-inventory.vercel.app/login](https://msu-zs-inventory.vercel.app/login)**
2. Enter your **Student ID** and **password**
3. You now have **full access** to everything!

### What you can do:

| Feature | Access |
|---------|--------|
| ✅ **Users** | Approve new accounts, create accounts, change roles, reset passwords |
| ✅ **Audit Trail** | View all system activity |
| ✅ **System Settings** | Configure penalties, borrow limits, etc. |
| ✅ **Inventory** | Add, edit, delete assets |
| ✅ **Categories & Locations** | Full CRUD management |
| ✅ **Borrow/Return** | Approve, reject, release items |
| ✅ **Radio Tracking** | Assign radios, track maintenance |
| ✅ **Lost & Damaged** | Review and update status |
| ✅ **Reports & Analytics** | Full access to all data insights |

---

## Managing ROTC Officers

As Logistics Officer (S-4), you can manage users from the **Users** page in the app:

| Action | How |
|--------|-----|
| **Approve new accounts** | Click ✅ on pending ROTC Officers |
| **Create new account** | Click "Create Officer Account" button |
| **Reset password to Student ID** | Click 🔑 icon on any user |
| **Change role** | Click ⚙ icon (cannot change another Logistics Officer) |
| **Activate/Deactivate** | Toggle user access with ❌ button |

> **Creating new accounts:** When you create an account as **Logistics Officer** via the dialog, it's **auto-approved**. ROTC Officer accounts start as **pending**.

---

## Default Credentials for New Accounts

```
Login ID: 2024-XXXXX (Student ID number)
Default Password: 2024-XXXXX (same as Student ID)
```

Officers can change their password after logging in via **Settings** > **Change Password**.

---

## Configure Auth Settings

In your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://msu-zs-inventory.vercel.app`
3. In **Redirect URLs**, add:
   ```
   https://msu-zs-inventory.vercel.app/auth/callback
   https://msu-zs-inventory.vercel.app/*
   ```
4. Click **"Save"**

---

## Need Help?

If you encounter any issues, check the Supabase SQL Editor console for error messages, or contact the system developer.
