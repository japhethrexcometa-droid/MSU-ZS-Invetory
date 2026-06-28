-- =============================================================
-- MSU-ZS ROTC Inventory & Asset Management System
-- Database Schema Migration
-- =============================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ENUMS
create type user_role as enum (
  'system_administrator',
  'rotc_commandant',
  'supply_officer',
  'logistics_officer',
  'property_custodian',
  'rotc_officer',
  'student_cadet'
);

create type asset_condition as enum ('excellent', 'good', 'fair', 'poor', 'damaged');
create type asset_status as enum ('available', 'borrowed', 'maintenance', 'lost', 'disposed');
create type borrow_status as enum ('pending', 'approved', 'released', 'returned', 'late', 'lost', 'damaged', 'rejected');
create type maintenance_type as enum ('routine', 'repair', 'inspection', 'calibration', 'emergency');
create type maintenance_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');

-- 3. TABLES

-- 3.1 Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  middle_name text,
  role user_role not null default 'student_cadet',
  student_number text unique,
  officer_id text unique,
  contact_number text,
  profile_image text,
  is_active boolean not null default true,
  is_approved boolean not null default false,
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 Categories
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  description text,
  parent_id uuid references public.categories(id) on delete set null,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.3 Locations
create table public.locations (
  id uuid primary key default uuid_generate_v4(),
  building text not null,
  room text,
  cabinet text,
  shelf text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(building, room, cabinet, shelf)
);

-- 3.4 Assets (Inventory Items)
create table public.assets (
  id uuid primary key default uuid_generate_v4(),
  asset_id text unique not null, -- Auto-generated: MSUZS-ROTC-YYYY-NNNN
  item_name text not null,
  category_id uuid references public.categories(id) on delete restrict,
  description text,
  brand text,
  model text,
  serial_number text unique,
  property_number text unique,
  supplier text,
  purchase_date date,
  purchase_cost decimal(12, 2),
  funding_source text,
  location_id uuid references public.locations(id) on delete set null,
  assigned_officer_id uuid references public.profiles(id) on delete set null,
  condition asset_condition not null default 'good',
  status asset_status not null default 'available',
  image_url text,
  qr_code text, -- QR code data URL
  barcode text,
  warranty_expiry date,
  useful_life_months integer,
  is_radio boolean not null default false,
  -- Radio-specific fields
  radio_frequency text,
  battery_status text,
  -- Metadata
  remarks text,
  is_deleted boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- 3.5 Asset Documents
create table public.asset_documents (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  document_type text not null, -- 'warranty', 'receipt', 'property_document', 'image', 'other'
  file_name text not null,
  file_url text not null,
  file_size integer,
  mime_type text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 3.6 Borrow Transactions
create table public.borrow_transactions (
  id uuid primary key default uuid_generate_v4(),
  transaction_no text unique not null, -- Auto-generated: BOR-YYYY-NNNN
  asset_id uuid not null references public.assets(id) on delete restrict,
  borrower_id uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id),
  released_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  borrow_date timestamptz not null default now(),
  expected_return_date timestamptz not null,
  actual_return_date timestamptz,
  purpose text,
  status borrow_status not null default 'pending',
  borrow_slip_url text, -- Generated PDF
  return_receipt_url text,
  condition_before asset_condition,
  condition_after asset_condition,
  return_notes text,
  penalty_amount decimal(10, 2) default 0,
  penalty_paid boolean default false,
  borrower_signature text, -- Data URL of signature
  officer_signature text,
  gps_location text, -- Optional GPS on borrow
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.7 Lost Reports
create table public.lost_reports (
  id uuid primary key default uuid_generate_v4(),
  report_no text unique not null, -- LOST-YYYY-NNNN
  asset_id uuid not null references public.assets(id) on delete restrict,
  transaction_id uuid references public.borrow_transactions(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  date_lost date not null,
  location_lost text,
  description text not null,
  investigation_notes text,
  investigating_officer_id uuid references public.profiles(id),
  officer_remarks text,
  replacement_status text default 'pending', -- 'pending', 'ordered', 'received', 'not_applicable'
  is_approved boolean default false,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.8 Lost Report Evidence
create table public.lost_report_evidence (
  id uuid primary key default uuid_generate_v4(),
  lost_report_id uuid not null references public.lost_reports(id) on delete cascade,
  file_url text not null,
  file_type text not null, -- 'photo', 'document'
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 3.9 Damage Reports
create table public.damage_reports (
  id uuid primary key default uuid_generate_v4(),
  report_no text unique not null, -- DAM-YYYY-NNNN
  asset_id uuid not null references public.assets(id) on delete restrict,
  transaction_id uuid references public.borrow_transactions(id) on delete set null,
  reporter_id uuid not null references public.profiles(id) on delete restrict,
  damage_description text not null,
  estimated_repair_cost decimal(12, 2),
  actual_repair_cost decimal(12, 2),
  assigned_technician text,
  repair_status text default 'pending', -- 'pending', 'in_progress', 'completed', 'irreparable'
  repair_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.10 Damage Report Photos
create table public.damage_report_photos (
  id uuid primary key default uuid_generate_v4(),
  damage_report_id uuid not null references public.damage_reports(id) on delete cascade,
  file_url text not null,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 3.11 Maintenance Records
create table public.maintenance_records (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  maintenance_type maintenance_type not null default 'routine',
  description text not null,
  scheduled_date date,
  completed_date date,
  performed_by uuid references public.profiles(id),
  cost decimal(12, 2),
  notes text,
  status maintenance_status not null default 'scheduled',
  next_maintenance_date date,
  health_score integer check (health_score >= 0 and health_score <= 100), -- Equipment health score
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.12 Radio Tracking
create table public.radio_tracking (
  id uuid primary key default uuid_generate_v4(),
  asset_id uuid not null references public.assets(id) on delete restrict,
  current_holder_id uuid references public.profiles(id),
  last_borrower_id uuid references public.profiles(id),
  assigned_officer_id uuid references public.profiles(id),
  frequency text,
  battery_status text,
  issue_date timestamptz,
  return_date timestamptz,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.13 Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null, -- 'borrow_approved', 'borrow_rejected', 'due_reminder', 'late_return', 'lost_item', 'damaged_item', 'low_stock', 'maintenance', 'new_equipment', 'account_approved'
  reference_type text, -- 'asset', 'borrow', 'lost_report', 'maintenance', 'user'
  reference_id uuid,
  is_read boolean not null default false,
  is_email_sent boolean default false,
  created_at timestamptz not null default now()
);

-- 3.14 Audit Logs
create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 3.15 System Settings
create table public.system_settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.16 Activity Log (for dashboard timeline)
create table public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id),
  activity_type text not null, -- 'created', 'updated', 'borrowed', 'returned', 'lost', 'damaged', 'maintenance'
  description text not null,
  reference_type text,
  reference_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- 4. INDEXES
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_is_active on public.profiles(is_active);
create index idx_assets_category on public.assets(category_id);
create index idx_assets_status on public.assets(status);
create index idx_assets_location on public.assets(location_id);
create index idx_assets_assigned_officer on public.assets(assigned_officer_id);
create index idx_assets_is_radio on public.assets(is_radio);
create index idx_assets_serial_number on public.assets(serial_number);
create index idx_borrow_asset on public.borrow_transactions(asset_id);
create index idx_borrow_borrower on public.borrow_transactions(borrower_id);
create index idx_borrow_status on public.borrow_transactions(status);
create index idx_borrow_dates on public.borrow_transactions(borrow_date, expected_return_date);
create index idx_notifications_user on public.notifications(user_id, is_read);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_user on public.audit_logs(user_id);
create index idx_audit_logs_created on public.audit_logs(created_at);
create index idx_maintenance_asset on public.maintenance_records(asset_id);
create index idx_maintenance_status on public.maintenance_records(status);
create index idx_maintenance_dates on public.maintenance_records(scheduled_date);
create index idx_lost_reports_asset on public.lost_reports(asset_id);
create index idx_damage_reports_asset on public.damage_reports(asset_id);
create index idx_activity_log_user on public.activity_log(user_id);
create index idx_activity_log_created on public.activity_log(created_at);

-- 5. AUTO-GENERATE ASSET ID FUNCTION
create function public.generate_asset_id()
returns text as $$
declare
  year_part text;
  sequence_num integer;
begin
  year_part := to_char(now(), 'YYYY');
  select coalesce(max(nullif(regexp_replace(asset_id, '^MSUZS-ROTC-' || year_part || '-', ''), ''))::integer, 0) + 1
  into sequence_num
  from public.assets
  where asset_id like 'MSUZS-ROTC-' || year_part || '-%';

  return 'MSUZS-ROTC-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
end;
$$ language plpgsql;

-- 6. AUTO-GENERATE TRANSACTION NO FUNCTION
create function public.generate_transaction_no(prefix text)
returns text as $$
declare
  year_part text;
  sequence_num integer;
begin
  year_part := to_char(now(), 'YYYY');
  execute format(
    'select coalesce(max(nullif(regexp_replace(transaction_no, ''^%s-'' || $1 || ''-'', ''''), ''''))::integer, 0) + 1 from public.borrow_transactions where transaction_no like ''%s-'' || $1 || ''-%%''',
    prefix, prefix
  ) into sequence_num using year_part;

  return prefix || '-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
end;
$$ language plpgsql;

-- 7. TRIGGER: Auto-assign asset_id on insert
create function public.assign_asset_id()
returns trigger as $$
begin
  if new.asset_id is null then
    new.asset_id := public.generate_asset_id();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_asset_id
  before insert on public.assets
  for each row
  execute function public.assign_asset_id();

-- 8. TRIGGER: Auto-assign transaction_no on insert
create function public.assign_transaction_no()
returns trigger as $$
begin
  if new.transaction_no is null then
    new.transaction_no := public.generate_transaction_no('BOR');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_transaction_no
  before insert on public.borrow_transactions
  for each row
  execute function public.assign_transaction_no();

-- 9. TRIGGER: Update updated_at on row change
create function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger trg_assets_updated_at before update on public.assets
  for each row execute function public.update_updated_at();
create trigger trg_categories_updated_at before update on public.categories
  for each row execute function public.update_updated_at();
create trigger trg_locations_updated_at before update on public.locations
  for each row execute function public.update_updated_at();
create trigger trg_borrow_updated_at before update on public.borrow_transactions
  for each row execute function public.update_updated_at();
create trigger trg_maintenance_updated_at before update on public.maintenance_records
  for each row execute function public.update_updated_at();
create trigger trg_lost_reports_updated_at before update on public.lost_reports
  for each row execute function public.update_updated_at();
create trigger trg_damage_reports_updated_at before update on public.damage_reports
  for each row execute function public.update_updated_at();

-- 10. TRIGGER: Log all changes to audit_logs (with safe IP extraction)
create function public.log_audit()
returns trigger as $$
declare
  client_ip text;
begin
  begin
    client_ip := current_setting('request.headers')::jsonb ->> 'x-forwarded-for';
  exception when others then
    client_ip := NULL;
  end;

  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
    values (auth.uid(), 'CREATE', tg_table_name, new.id, to_jsonb(new), client_ip);
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
    values (auth.uid(), 'UPDATE', tg_table_name, new.id, to_jsonb(old), to_jsonb(new), client_ip);
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address)
    values (auth.uid(), 'DELETE', tg_table_name, old.id, to_jsonb(old), client_ip);
    return old;
  end if;
end;
$$ language plpgsql security definer;

-- 10b. TRIGGER: Auto-generate report_no for lost reports
create function public.assign_lost_report_no()
returns trigger as $$
declare
  year_part text;
  sequence_num integer;
begin
  if new.report_no is null then
    year_part := to_char(now(), 'YYYY');
    select coalesce(max(nullif(regexp_replace(report_no, '^LOST-' || year_part || '-', ''), ''))::integer, 0) + 1
    into sequence_num
    from public.lost_reports
    where report_no like 'LOST-' || year_part || '-%';
    new.report_no := 'LOST-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_lost_report_no
  before insert on public.lost_reports
  for each row
  execute function public.assign_lost_report_no();

-- 10c. TRIGGER: Auto-generate report_no for damage reports
create function public.assign_damage_report_no()
returns trigger as $$
declare
  year_part text;
  sequence_num integer;
begin
  if new.report_no is null then
    year_part := to_char(now(), 'YYYY');
    select coalesce(max(nullif(regexp_replace(report_no, '^DAM-' || year_part || '-', ''), ''))::integer, 0) + 1
    into sequence_num
    from public.damage_reports
    where report_no like 'DAM-' || year_part || '-%';
    new.report_no := 'DAM-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_assign_damage_report_no
  before insert on public.damage_reports
  for each row
  execute function public.assign_damage_report_no();

create trigger trg_audit_assets after insert or update or delete on public.assets
  for each row execute function public.log_audit();
create trigger trg_audit_borrow after insert or update or delete on public.borrow_transactions
  for each row execute function public.log_audit();
create trigger trg_audit_categories after insert or update or delete on public.categories
  for each row execute function public.log_audit();
create trigger trg_audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.log_audit();

-- 11. ROW LEVEL SECURITY

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.categories enable row level security;
alter table public.locations enable row level security;
alter table public.borrow_transactions enable row level security;
alter table public.lost_reports enable row level security;
alter table public.damage_reports enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.activity_log enable row level security;
alter table public.system_settings enable row level security;
alter table public.asset_documents enable row level security;
alter table public.lost_report_evidence enable row level security;
alter table public.damage_report_photos enable row level security;
alter table public.radio_tracking enable row level security;

-- Profiles: Users can read their own profile; admins read all
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_administrator'));

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can insert profiles"
  on public.profiles for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_administrator'));

create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_administrator'));

-- Assets: All authenticated users can view
create policy "All authenticated can view assets"
  on public.assets for select
  using (auth.role() = 'authenticated' and is_deleted = false);

create policy "Supply officers and admins can insert assets"
  on public.assets for insert
  with check (exists (select 1 from public.profiles where id = auth.uid() and role in ('system_administrator', 'supply_officer')));

create policy "Supply officers and admins can update assets"
  on public.assets for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('system_administrator', 'supply_officer')));

-- Borrow: Users see their own, officers see relevant ones
create policy "Users can view own borrows"
  on public.borrow_transactions for select
  using (borrower_id = auth.uid());

create policy "Officers can view all borrows"
  on public.borrow_transactions for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('system_administrator', 'rotc_commandant', 'supply_officer', 'logistics_officer', 'rotc_officer')));

create policy "Users can create borrow requests"
  on public.borrow_transactions for insert
  with check (borrower_id = auth.uid());

-- Notifications: Users see their own
create policy "Users can view own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

-- Add missing read policies for categories and locations
create policy "All authenticated can view categories"
  on public.categories for select
  using (auth.role() = 'authenticated');

create policy "All authenticated can view locations"
  on public.locations for select
  using (auth.role() = 'authenticated');

-- Audit logs: Only admins can view
create policy "Only admins can view audit logs"
  on public.audit_logs for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'system_administrator'));

-- Lost reports: users can see their own, officers see relevant
create policy "Users can view own lost reports"
  on public.lost_reports for select
  using (reporter_id = auth.uid());

create policy "Officers can view all lost reports"
  on public.lost_reports for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('system_administrator', 'rotc_commandant', 'supply_officer', 'property_custodian')));

-- 12. DEFAULT DATA

-- Insert default categories
insert into public.categories (name, slug, description) values
  ('Uniforms', 'uniforms', 'Military uniforms and accessories'),
  ('Boots', 'boots', 'Combat boots and footwear'),
  ('Belts', 'belts', 'Uniform belts and accessories'),
  ('Radios', 'radios', 'Communication radios and equipment'),
  ('Batteries', 'batteries', 'Batteries for various equipment'),
  ('Chargers', 'chargers', 'Battery chargers and power supplies'),
  ('Megaphones', 'megaphones', 'Amplified communication devices'),
  ('Flags', 'flags', 'Official flags and banners'),
  ('Medical Kits', 'medical-kits', 'First aid and medical equipment'),
  ('Office Equipment', 'office-equipment', 'General office equipment'),
  ('Computers', 'computers', 'Desktop and laptop computers'),
  ('Printers', 'printers', 'Printing devices'),
  ('Projectors', 'projectors', 'Multimedia projectors'),
  ('Tables', 'tables', 'Office and training tables'),
  ('Chairs', 'chairs', 'Office and training chairs'),
  ('Training Equipment', 'training-equipment', 'ROTC training materials and gear'),
  ('Camping Equipment', 'camping-equipment', 'Camping and field equipment'),
  ('Cleaning Supplies', 'cleaning-supplies', 'Cleaning materials and supplies'),
  ('Documents', 'documents', 'Official documents and records'),
  ('Office Supplies', 'office-supplies', 'Consumable office supplies'),
  ('Vehicle Equipment', 'vehicle-equipment', 'Vehicle-related equipment'),
  ('Communication Equipment', 'communication-equipment', 'General communication devices'),
  ('Emergency Equipment', 'emergency-equipment', 'Emergency response equipment'),
  ('Fire Safety Equipment', 'fire-safety', 'Fire extinguishers and safety gear'),
  ('Sports Equipment', 'sports-equipment', 'Sports and physical training gear'),
  ('Others', 'others', 'Miscellaneous items')
on conflict (slug) do nothing;

-- Default system settings
insert into public.system_settings (key, value, description) values
  ('institution_name', '"Mindanao State University - Zamboanga"', 'Institution name'),
  ('unit_name', '"MSU-ZS ROTC Unit"', 'ROTC Unit name'),
  ('penalty_per_day', '50', 'Daily penalty fee for late returns (PHP)'),
  ('max_borrow_days', '14', 'Maximum borrowing period in days'),
  ('enable_notifications', 'true', 'Enable email notifications'),
  ('auto_overdue_check', 'true', 'Enable automatic overdue detection')
on conflict (key) do nothing;
