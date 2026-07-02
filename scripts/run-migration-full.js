/**
 * Runs the Supabase migration SQL as a single request via Management API.
 */
const fs = require("fs");
const https = require("https");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pcvqgpfpighxzdcjggnn";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set.");
  console.error("Get it from: Supabase Dashboard > Account > Access Tokens (create a Personal Access Token)");
  process.exit(1);
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body.substring(0, 500)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const sql = fs.readFileSync("supabase/migrations/00001_schema.sql", "utf8");

  // Step 1: Drop existing objects that would conflict (enums, functions that already exist)
  console.log("=== Step 1: Dropping conflicting objects ===");
  try {
    await executeSQL(`
      -- Drop triggers that reference our functions
      DROP TRIGGER IF EXISTS trg_assign_asset_id ON public.assets;
      DROP TRIGGER IF EXISTS trg_assign_transaction_no ON public.borrow_transactions;
      DROP TRIGGER IF EXISTS trg_assign_lost_report_no ON public.lost_reports;
      DROP TRIGGER IF EXISTS trg_assign_damage_report_no ON public.damage_reports;
      DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;
      DROP TRIGGER IF EXISTS trg_audit_borrow ON public.borrow_transactions;
      DROP TRIGGER IF EXISTS trg_audit_categories ON public.categories;
      DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
      DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
      DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
      DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
      DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
      DROP TRIGGER IF EXISTS trg_borrow_updated_at ON public.borrow_transactions;
      DROP TRIGGER IF EXISTS trg_maintenance_updated_at ON public.maintenance_records;
      DROP TRIGGER IF EXISTS trg_lost_reports_updated_at ON public.lost_reports;
      DROP TRIGGER IF EXISTS trg_damage_reports_updated_at ON public.damage_reports;
    `);
    console.log("  ✓ Dropped existing triggers");
  } catch (e) {
    console.log("  - Skipping trigger drops (may not exist yet): " + e.message.substring(0, 100));
  }

  // Step 2: Create tables with IF NOT EXISTS
  console.log("=== Step 2: Creating tables ===");
  
  const createTableSQL = `
    -- Profiles
    CREATE TABLE IF NOT EXISTS public.profiles (
      id uuid primary key references auth.users(id) on delete cascade,
      email text,
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

    -- Categories
    CREATE TABLE IF NOT EXISTS public.categories (
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

    -- Locations
    CREATE TABLE IF NOT EXISTS public.locations (
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

    -- Assets
    CREATE TABLE IF NOT EXISTS public.assets (
      id uuid primary key default uuid_generate_v4(),
      asset_id text unique not null,
      item_name text not null,
      category_id uuid references public.categories(id) on delete restrict,
      description text,
      brand text,
      model text,
      serial_number text,
      property_number text,
      supplier text,
      purchase_date date,
      purchase_cost decimal(12, 2),
      funding_source text,
      location_id uuid references public.locations(id) on delete set null,
      assigned_officer_id uuid references public.profiles(id) on delete set null,
      condition asset_condition not null default 'good',
      status asset_status not null default 'available',
      image_url text,
      qr_code text,
      barcode text,
      warranty_expiry date,
      useful_life_months integer,
      is_radio boolean not null default false,
      radio_frequency text,
      battery_status text,
      remarks text,
      is_deleted boolean not null default false,
      deleted_at timestamptz,
      deleted_by uuid references public.profiles(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      created_by uuid references public.profiles(id)
    );

    -- Asset Documents
    CREATE TABLE IF NOT EXISTS public.asset_documents (
      id uuid primary key default uuid_generate_v4(),
      asset_id uuid not null references public.assets(id) on delete cascade,
      document_type text not null,
      file_name text not null,
      file_url text not null,
      file_size integer,
      mime_type text,
      uploaded_by uuid references public.profiles(id),
      created_at timestamptz not null default now()
    );

    -- Borrow Transactions
    CREATE TABLE IF NOT EXISTS public.borrow_transactions (
      id uuid primary key default uuid_generate_v4(),
      transaction_no text,
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
      borrow_slip_url text,
      return_receipt_url text,
      condition_before asset_condition,
      condition_after asset_condition,
      return_notes text,
      penalty_amount decimal(10, 2) default 0,
      penalty_paid boolean default false,
      borrower_signature text,
      officer_signature text,
      gps_location text,
      is_deleted boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Lost Reports
    CREATE TABLE IF NOT EXISTS public.lost_reports (
      id uuid primary key default uuid_generate_v4(),
      report_no text,
      asset_id uuid not null references public.assets(id) on delete restrict,
      transaction_id uuid references public.borrow_transactions(id) on delete set null,
      reporter_id uuid not null references public.profiles(id) on delete restrict,
      date_lost date not null,
      location_lost text,
      description text not null,
      investigation_notes text,
      investigating_officer_id uuid references public.profiles(id),
      officer_remarks text,
      replacement_status text default 'pending',
      is_approved boolean default false,
      approved_by uuid references public.profiles(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Lost Report Evidence
    CREATE TABLE IF NOT EXISTS public.lost_report_evidence (
      id uuid primary key default uuid_generate_v4(),
      lost_report_id uuid not null references public.lost_reports(id) on delete cascade,
      file_url text not null,
      file_type text not null,
      uploaded_by uuid references public.profiles(id),
      created_at timestamptz not null default now()
    );

    -- Damage Reports
    CREATE TABLE IF NOT EXISTS public.damage_reports (
      id uuid primary key default uuid_generate_v4(),
      report_no text,
      asset_id uuid not null references public.assets(id) on delete restrict,
      transaction_id uuid references public.borrow_transactions(id) on delete set null,
      reporter_id uuid not null references public.profiles(id) on delete restrict,
      damage_description text not null,
      estimated_repair_cost decimal(12, 2),
      actual_repair_cost decimal(12, 2),
      assigned_technician text,
      repair_status text default 'pending',
      repair_notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Damage Report Photos
    CREATE TABLE IF NOT EXISTS public.damage_report_photos (
      id uuid primary key default uuid_generate_v4(),
      damage_report_id uuid not null references public.damage_reports(id) on delete cascade,
      file_url text not null,
      uploaded_by uuid references public.profiles(id),
      created_at timestamptz not null default now()
    );

    -- Maintenance Records
    CREATE TABLE IF NOT EXISTS public.maintenance_records (
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
      health_score integer check (health_score >= 0 and health_score <= 100),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Radio Tracking
    CREATE TABLE IF NOT EXISTS public.radio_tracking (
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

    -- Notifications
    CREATE TABLE IF NOT EXISTS public.notifications (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid not null references public.profiles(id) on delete cascade,
      title text not null,
      message text not null,
      type text not null,
      reference_type text,
      reference_id uuid,
      is_read boolean not null default false,
      is_email_sent boolean default false,
      created_at timestamptz not null default now()
    );

    -- Audit Logs
    CREATE TABLE IF NOT EXISTS public.audit_logs (
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

    -- System Settings
    CREATE TABLE IF NOT EXISTS public.system_settings (
      id uuid primary key default uuid_generate_v4(),
      key text unique not null,
      value jsonb not null,
      description text,
      updated_by uuid references public.profiles(id),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    -- Activity Log
    CREATE TABLE IF NOT EXISTS public.activity_log (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid not null references public.profiles(id),
      activity_type text not null,
      description text not null,
      reference_type text,
      reference_id uuid,
      metadata jsonb,
      created_at timestamptz not null default now()
    );
  `;

  try {
    await executeSQL(createTableSQL);
    console.log("  ✓ All tables created");
  } catch (e) {
    console.log("  ✗ Table creation error: " + e.message.substring(0, 300));
  }

  // Step 3: Drop and recreate functions/triggers (need IF NOT EXISTS or DROP first)
  console.log("=== Step 3: Creating functions and triggers ===");
  
  const functionsSQL = `
    -- Asset ID generator
    CREATE OR REPLACE FUNCTION public.generate_asset_id()
    RETURNS text AS $$
    DECLARE
      year_part text;
      sequence_num integer;
    BEGIN
      year_part := to_char(now(), 'YYYY');
      SELECT coalesce(max(nullif(regexp_replace(asset_id, '^MSUZS-ROTC-' || year_part || '-', ''), '')::integer), 0) + 1
      INTO sequence_num
      FROM public.assets
      WHERE asset_id LIKE 'MSUZS-ROTC-' || year_part || '-%';
      RETURN 'MSUZS-ROTC-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
    END;
    $$ LANGUAGE plpgsql;

    -- Transaction no generator
    CREATE OR REPLACE FUNCTION public.generate_transaction_no(prefix text)
    RETURNS text LANGUAGE plpgsql AS $func$
    DECLARE
      year_part text;
      sequence_num integer;
    BEGIN
      year_part := to_char(now(), 'YYYY');
      EXECUTE format(
        'SELECT coalesce(max(nullif(regexp_replace(transaction_no, ''^%s-'' || $1 || ''-'', ''''), '''')::integer), 0) + 1 FROM public.borrow_transactions WHERE transaction_no LIKE ''%s-'' || $1 || ''-%%''',
        prefix, prefix
      ) INTO sequence_num USING year_part;
      RETURN prefix || '-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
    END;
    $func$;

    -- Update updated_at
    CREATE OR REPLACE FUNCTION public.update_updated_at()
    RETURNS trigger AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await executeSQL(functionsSQL);
    console.log("  ✓ Functions created");
  } catch (e) {
    console.log("  ✗ Function creation error: " + e.message.substring(0, 200));
  }

  // Step 4: Create indexes
  console.log("=== Step 4: Creating indexes ===");
  const indexSQL = `
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
    CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category_id);
    CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
    CREATE INDEX IF NOT EXISTS idx_assets_location ON public.assets(location_id);
    CREATE INDEX IF NOT EXISTS idx_assets_assigned_officer ON public.assets(assigned_officer_id);
    CREATE INDEX IF NOT EXISTS idx_assets_is_radio ON public.assets(is_radio);
    CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON public.assets(serial_number);
    CREATE INDEX IF NOT EXISTS idx_borrow_asset ON public.borrow_transactions(asset_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_borrower ON public.borrow_transactions(borrower_id);
    CREATE INDEX IF NOT EXISTS idx_borrow_status ON public.borrow_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_borrow_dates ON public.borrow_transactions(borrow_date, expected_return_date);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_maintenance_asset ON public.maintenance_records(asset_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_records(status);
    CREATE INDEX IF NOT EXISTS idx_maintenance_dates ON public.maintenance_records(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_lost_reports_asset ON public.lost_reports(asset_id);
    CREATE INDEX IF NOT EXISTS idx_damage_reports_asset ON public.damage_reports(asset_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created ON public.activity_log(created_at);
  `;

  try {
    await executeSQL(indexSQL);
    console.log("  ✓ Indexes created");
  } catch (e) {
    console.log("  ✗ Index creation error: " + e.message.substring(0, 200));
  }

  // Step 5: Create triggers
  console.log("=== Step 5: Creating triggers ===");
  const triggerSQL = `
    -- Assign asset_id
    CREATE OR REPLACE FUNCTION public.assign_asset_id()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.asset_id IS NULL THEN
        NEW.asset_id := public.generate_asset_id();
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_assign_asset_id ON public.assets;
    CREATE TRIGGER trg_assign_asset_id
      BEFORE INSERT ON public.assets
      FOR EACH ROW EXECUTE FUNCTION public.assign_asset_id();

    -- Assign transaction_no
    CREATE OR REPLACE FUNCTION public.assign_transaction_no()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.transaction_no IS NULL THEN
        NEW.transaction_no := public.generate_transaction_no('BOR');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_assign_transaction_no ON public.borrow_transactions;
    CREATE TRIGGER trg_assign_transaction_no
      BEFORE INSERT ON public.borrow_transactions
      FOR EACH ROW EXECUTE FUNCTION public.assign_transaction_no();

    -- Updated_at triggers
    DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
    CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_assets_updated_at ON public.assets;
    CREATE TRIGGER trg_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
    CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_locations_updated_at ON public.locations;
    CREATE TRIGGER trg_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_borrow_updated_at ON public.borrow_transactions;
    CREATE TRIGGER trg_borrow_updated_at BEFORE UPDATE ON public.borrow_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_maintenance_updated_at ON public.maintenance_records;
    CREATE TRIGGER trg_maintenance_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_lost_reports_updated_at ON public.lost_reports;
    CREATE TRIGGER trg_lost_reports_updated_at BEFORE UPDATE ON public.lost_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
    DROP TRIGGER IF EXISTS trg_damage_reports_updated_at ON public.damage_reports;
    CREATE TRIGGER trg_damage_reports_updated_at BEFORE UPDATE ON public.damage_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    -- Audit logging function
    CREATE OR REPLACE FUNCTION public.log_audit()
    RETURNS trigger AS $$
    DECLARE
      client_ip text;
    BEGIN
      BEGIN
        client_ip := current_setting('request.headers')::jsonb ->> 'x-forwarded-for';
      EXCEPTION WHEN OTHERS THEN
        client_ip := NULL;
      END;

      IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address)
        VALUES (auth.uid(), 'CREATE', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), client_ip);
        RETURN NEW;
      ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
        VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), client_ip);
        RETURN NEW;
      ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, ip_address)
        VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD), client_ip);
        RETURN OLD;
      END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Audit triggers
    DROP TRIGGER IF EXISTS trg_audit_assets ON public.assets;
    CREATE TRIGGER trg_audit_assets AFTER INSERT OR UPDATE OR DELETE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.log_audit();
    DROP TRIGGER IF EXISTS trg_audit_borrow ON public.borrow_transactions;
    CREATE TRIGGER trg_audit_borrow AFTER INSERT OR UPDATE OR DELETE ON public.borrow_transactions FOR EACH ROW EXECUTE FUNCTION public.log_audit();
    DROP TRIGGER IF EXISTS trg_audit_categories ON public.categories;
    CREATE TRIGGER trg_audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.log_audit();
    DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
    CREATE TRIGGER trg_audit_profiles AFTER INSERT OR UPDATE OR DELETE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_audit();

    -- Lost report no assigner
    CREATE OR REPLACE FUNCTION public.assign_lost_report_no()
    RETURNS trigger AS $$
    DECLARE
      year_part text;
      sequence_num integer;
    BEGIN
      IF NEW.report_no IS NULL THEN
        year_part := to_char(now(), 'YYYY');
        SELECT coalesce(max(nullif(regexp_replace(report_no, '^LOST-' || year_part || '-', ''), '')::integer), 0) + 1
        INTO sequence_num
        FROM public.lost_reports
        WHERE report_no LIKE 'LOST-' || year_part || '-%';
        NEW.report_no := 'LOST-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_assign_lost_report_no ON public.lost_reports;
    CREATE TRIGGER trg_assign_lost_report_no
      BEFORE INSERT ON public.lost_reports
      FOR EACH ROW EXECUTE FUNCTION public.assign_lost_report_no();

    -- Damage report no assigner
    CREATE OR REPLACE FUNCTION public.assign_damage_report_no()
    RETURNS trigger AS $$
    DECLARE
      year_part text;
      sequence_num integer;
    BEGIN
      IF NEW.report_no IS NULL THEN
        year_part := to_char(now(), 'YYYY');
        SELECT coalesce(max(nullif(regexp_replace(report_no, '^DAM-' || year_part || '-', ''), '')::integer), 0) + 1
        INTO sequence_num
        FROM public.damage_reports
        WHERE report_no LIKE 'DAM-' || year_part || '-%';
        NEW.report_no := 'DAM-' || year_part || '-' || lpad(sequence_num::text, 4, '0');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_assign_damage_report_no ON public.damage_reports;
    CREATE TRIGGER trg_assign_damage_report_no
      BEFORE INSERT ON public.damage_reports
      FOR EACH ROW EXECUTE FUNCTION public.assign_damage_report_no();
  `;

  try {
    await executeSQL(triggerSQL);
    console.log("  ✓ Triggers created");
  } catch (e) {
    console.log("  ✗ Trigger creation error: " + e.message.substring(0, 300));
  }

  // Step 6: Enable RLS
  console.log("=== Step 6: Enabling RLS ===");
  const rlsSQL = `
    ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.assets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.locations ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.borrow_transactions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.lost_reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.damage_reports ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.maintenance_records ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.activity_log ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.asset_documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.lost_report_evidence ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.damage_report_photos ENABLE ROW LEVEL SECURITY;
    ALTER TABLE IF EXISTS public.radio_tracking ENABLE ROW LEVEL SECURITY;
  `;

  try {
    await executeSQL(rlsSQL);
    console.log("  ✓ RLS enabled");
  } catch (e) {
    console.log("  ✗ RLS error: " + e.message.substring(0, 200));
  }

  // Step 7: Insert default data
  console.log("=== Step 7: Inserting default data ===");
  const dataSQL = `
    INSERT INTO public.categories (name, slug, description) VALUES
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
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.system_settings (key, value, description) VALUES
      ('institution_name', '"Mindanao State University - Zamboanga"', 'Institution name'),
      ('unit_name', '"MSU-ZS ROTC Unit"', 'ROTC Unit name'),
      ('penalty_per_day', '50', 'Daily penalty fee for late returns (PHP)'),
      ('max_borrow_days', '14', 'Maximum borrowing period in days'),
      ('enable_notifications', 'true', 'Enable email notifications'),
      ('auto_overdue_check', 'true', 'Enable automatic overdue detection')
    ON CONFLICT (key) DO NOTHING;
  `;

  try {
    await executeSQL(dataSQL);
    console.log("  ✓ Default data inserted");
  } catch (e) {
    console.log("  ✗ Data insertion error: " + e.message.substring(0, 200));
  }

  // Step 8: Verify
  console.log("\n=== Step 8: Verification ===");
  const verify = await executeSQL(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '\\_\\_%' ORDER BY table_name"
  );
  const tables = JSON.parse(verify);
  console.log(`Tables created: ${tables.length}`);
  tables.forEach((t) => console.log(`  ✓ ${t.table_name}`));

  console.log("\n=== Migration Complete! ===");
}

main().catch((err) => {
  console.error("Fatal error:", err.message.substring(0, 500));
  process.exit(1);
});
