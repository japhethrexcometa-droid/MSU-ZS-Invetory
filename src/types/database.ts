// =============================================================
// MSU-ZS ROTC Inventory & Asset Management System
// TypeScript Type Definitions (Supabase Database types)
// =============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole =
  | "logistics_officer"
  | "rotc_officer";

export type AssetCondition = "excellent" | "good" | "fair" | "poor" | "damaged";
export type AssetStatus = "available" | "borrowed" | "maintenance" | "lost" | "disposed";
export type BorrowStatus =
  | "pending"
  | "approved"
  | "released"
  | "returned"
  | "late"
  | "lost"
  | "damaged"
  | "rejected";
export type MaintenanceType = "routine" | "repair" | "inspection" | "calibration" | "emergency";
export type MaintenanceStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  role: UserRole;
  student_number: string | null;
  officer_id: string | null;
  contact_number: string | null;
  profile_image: string | null;
  is_active: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  parent?: Category | null;
  children?: Category[];
}

export interface Location {
  id: string;
  building: string;
  room: string | null;
  cabinet: string | null;
  shelf: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  asset_id: string;
  item_name: string;
  category_id: string | null;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  property_number: string | null;
  supplier: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  funding_source: string | null;
  location_id: string | null;
  assigned_officer_id: string | null;
  condition: AssetCondition;
  status: AssetStatus;
  image_url: string | null;
  qr_code: string | null;
  barcode: string | null;
  warranty_expiry: string | null;
  useful_life_months: number | null;
  is_radio: boolean;
  radio_frequency: string | null;
  battery_status: string | null;
  remarks: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Joined fields
  category?: Category | null;
  location?: Location | null;
  assigned_officer?: Profile | null;
  documents?: AssetDocument[];
}

export interface AssetDocument {
  id: string;
  asset_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface BorrowTransaction {
  id: string;
  transaction_no: string;
  asset_id: string;
  borrower_id: string;
  approved_by: string | null;
  released_by: string | null;
  verified_by: string | null;
  borrow_date: string;
  expected_return_date: string;
  actual_return_date: string | null;
  purpose: string | null;
  status: BorrowStatus;
  borrow_slip_url: string | null;
  return_receipt_url: string | null;
  condition_before: AssetCondition | null;
  condition_after: AssetCondition | null;
  return_notes: string | null;
  penalty_amount: number | null;
  penalty_paid: boolean;
  borrower_signature: string | null;
  officer_signature: string | null;
  gps_location: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  asset?: Asset | null;
  borrower?: Profile | null;
  approved_by_profile?: Profile | null;
  released_by_profile?: Profile | null;
}

export interface LostReport {
  id: string;
  report_no: string;
  asset_id: string;
  transaction_id: string | null;
  reporter_id: string;
  date_lost: string;
  location_lost: string | null;
  description: string;
  investigation_notes: string | null;
  investigating_officer_id: string | null;
  officer_remarks: string | null;
  replacement_status: string;
  is_approved: boolean;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  asset?: Asset | null;
  reporter?: Profile | null;
  investigating_officer?: Profile | null;
  evidence?: LostReportEvidence[];
}

export interface LostReportEvidence {
  id: string;
  lost_report_id: string;
  file_url: string;
  file_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface DamageReport {
  id: string;
  report_no: string;
  asset_id: string;
  transaction_id: string | null;
  reporter_id: string;
  damage_description: string;
  estimated_repair_cost: number | null;
  actual_repair_cost: number | null;
  assigned_technician: string | null;
  repair_status: string;
  repair_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  asset?: Asset | null;
  reporter?: Profile | null;
  photos?: DamageReportPhoto[];
}

export interface DamageReportPhoto {
  id: string;
  damage_report_id: string;
  file_url: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  maintenance_type: MaintenanceType;
  description: string;
  scheduled_date: string | null;
  completed_date: string | null;
  performed_by: string | null;
  cost: number | null;
  notes: string | null;
  status: MaintenanceStatus;
  next_maintenance_date: string | null;
  health_score: number | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  asset?: Asset | null;
}

export interface RadioTracking {
  id: string;
  asset_id: string;
  current_holder_id: string | null;
  last_borrower_id: string | null;
  assigned_officer_id: string | null;
  frequency: string | null;
  battery_status: string | null;
  issue_date: string | null;
  return_date: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  is_email_sent: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined fields
  user?: Profile | null;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Json | null;
  created_at: string;
  // Joined fields
  user?: Profile | null;
}

// Database schema type for Supabase
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "created_at" | "updated_at">; Update: Partial<Profile> };
      categories: { Row: Category; Insert: Omit<Category, "created_at" | "updated_at">; Update: Partial<Category> };
      locations: { Row: Location; Insert: Omit<Location, "created_at" | "updated_at">; Update: Partial<Location> };
      assets: { Row: Asset; Insert: Omit<Asset, "created_at" | "updated_at" | "asset_id">; Update: Partial<Asset> };
      asset_documents: { Row: AssetDocument; Insert: Omit<AssetDocument, "created_at">; Update: Partial<AssetDocument> };
      borrow_transactions: { Row: BorrowTransaction; Insert: Omit<BorrowTransaction, "created_at" | "updated_at" | "transaction_no">; Update: Partial<BorrowTransaction> };
      lost_reports: { Row: LostReport; Insert: Omit<LostReport, "created_at" | "updated_at">; Update: Partial<LostReport> };
      lost_report_evidence: { Row: LostReportEvidence; Insert: Omit<LostReportEvidence, "created_at">; Update: Partial<LostReportEvidence> };
      damage_reports: { Row: DamageReport; Insert: Omit<DamageReport, "created_at" | "updated_at">; Update: Partial<DamageReport> };
      damage_report_photos: { Row: DamageReportPhoto; Insert: Omit<DamageReportPhoto, "created_at">; Update: Partial<DamageReportPhoto> };
      maintenance_records: { Row: MaintenanceRecord; Insert: Omit<MaintenanceRecord, "created_at" | "updated_at">; Update: Partial<MaintenanceRecord> };
      radio_tracking: { Row: RadioTracking; Insert: Omit<RadioTracking, "created_at" | "updated_at">; Update: Partial<RadioTracking> };
      notifications: { Row: Notification; Insert: Omit<Notification, "created_at">; Update: Partial<Notification> };
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, "created_at">; Update: Partial<AuditLog> };
      system_settings: { Row: SystemSetting; Insert: Omit<SystemSetting, "created_at" | "updated_at">; Update: Partial<SystemSetting> };
      activity_log: { Row: ActivityLog; Insert: Omit<ActivityLog, "created_at">; Update: Partial<ActivityLog> };
    };
    Views: {};
    Functions: {};
    Enums: {
      user_role: UserRole;
      asset_condition: AssetCondition;
      asset_status: AssetStatus;
      borrow_status: BorrowStatus;
      maintenance_type: MaintenanceType;
      maintenance_status: MaintenanceStatus;
    };
  };
}
