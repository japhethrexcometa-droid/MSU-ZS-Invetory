import { z } from "zod";

// ─── Helpers ─────────────────────────────────────────────

export const uuidSchema = z.string().uuid("Invalid UUID");
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/, "Invalid date format");
export const positiveNumber = z.number().min(0, "Must be zero or positive");
export const optionalPositiveNumber = z.number().min(0).optional();

// ─── Assets ───────────────────────────────────────────────

export const createAssetSchema = z.object({
  item_name: z.string().min(1, "Item name is required").max(255),
  category_id: z.string().uuid().nullable().optional().or(z.literal("")),
  description: z.string().max(2000).nullable().optional(),
  brand: z.string().max(255).nullable().optional(),
  model: z.string().max(255).nullable().optional(),
  serial_number: z.string().max(255).nullable().optional(),
  property_number: z.string().max(255).nullable().optional(),
  supplier: z.string().max(255).nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_cost: z.number().min(0).nullable().optional(),
  funding_source: z.string().max(255).nullable().optional(),
  location_id: z.string().uuid().nullable().optional().or(z.literal("")),
  assigned_officer_id: z.string().uuid().nullable().optional().or(z.literal("")),
  condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
  status: z.enum(["available", "borrowed", "maintenance", "lost", "disposed"]).default("available"),
  image_url: z.string().url().nullable().optional().or(z.literal("")),
  qr_code: z.string().nullable().optional(),
  warranty_expiry: z.string().nullable().optional(),
  useful_life_months: z.number().int().min(1).nullable().optional(),
  is_radio: z.boolean().default(false),
  radio_frequency: z.string().max(100).nullable().optional(),
  battery_status: z.string().max(50).nullable().optional(),
  remarks: z.string().max(2000).nullable().optional(),
});

export const updateAssetSchema = createAssetSchema.partial();

// ─── Borrow Transactions ─────────────────────────────────

export const createBorrowRequestSchema = z.object({
  asset_id: z.string().uuid("Asset is required"),
  borrower_id: z.string().uuid("Borrower is required"),
  expected_return_date: z.string().min(1, "Return date is required"),
  purpose: z.string().max(1000).optional(),
});

export const approveBorrowSchema = z.object({
  id: z.string().uuid(),
  approvedById: z.string().uuid().nullable(),
});

export const releaseBorrowSchema = z.object({
  id: z.string().uuid(),
  releasedById: z.string().uuid().nullable(),
  conditionBefore: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
  borrowerSignature: z.string().optional(),
  officerSignature: z.string().optional(),
});

export const processReturnSchema = z.object({
  id: z.string().uuid(),
  verified_by: z.string().uuid().nullable(),
  condition_after: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
  return_notes: z.string().max(2000).optional(),
  penalty_amount: z.number().min(0).optional(),
  penalty_paid: z.boolean().optional(),
});

export const reportLostFromBorrowSchema = z.object({
  transactionId: z.string().uuid(),
  reporter_id: z.string().uuid(),
  date_lost: z.string().min(1, "Date lost is required"),
  location_lost: z.string().max(500).optional(),
  description: z.string().min(1, "Description is required").max(2000),
});

export const reportDamageFromBorrowSchema = z.object({
  transactionId: z.string().uuid(),
  reporter_id: z.string().uuid(),
  damage_description: z.string().min(1, "Description is required").max(2000),
  estimated_repair_cost: z.number().min(0).optional(),
});

// ─── Categories ──────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(1000).optional(),
  parent_id: z.string().uuid().optional().or(z.literal("")),
  icon: z.string().max(100).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// ─── Locations ───────────────────────────────────────────

export const createLocationSchema = z.object({
  building: z.string().min(1, "Building is required").max(255),
  room: z.string().max(100).optional(),
  cabinet: z.string().max(100).optional(),
  shelf: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

// ─── Lost Reports ────────────────────────────────────────

export const createLostReportSchema = z.object({
  asset_id: z.string().uuid("Asset is required"),
  transaction_id: z.string().uuid().optional().or(z.literal("")),
  reporter_id: z.string().uuid("Reporter is required"),
  date_lost: z.string().min(1, "Date lost is required"),
  location_lost: z.string().max(500).optional(),
  description: z.string().min(1, "Description is required").max(2000),
});

export const updateLostReportSchema = z.object({
  investigation_notes: z.string().max(2000).optional(),
  investigating_officer_id: z.string().uuid().optional(),
  officer_remarks: z.string().max(2000).optional(),
  replacement_status: z.enum(["pending", "ordered", "received", "not_applicable"]).optional(),
  is_approved: z.boolean().optional(),
  approved_by: z.string().uuid().optional(),
});

// ─── Damage Reports ──────────────────────────────────────

export const createDamageReportSchema = z.object({
  asset_id: z.string().uuid("Asset is required"),
  transaction_id: z.string().uuid().optional().or(z.literal("")),
  reporter_id: z.string().uuid("Reporter is required"),
  damage_description: z.string().min(1, "Description is required").max(2000),
  estimated_repair_cost: z.number().min(0).optional(),
});

export const updateDamageReportSchema = z.object({
  actual_repair_cost: z.number().min(0).optional(),
  assigned_technician: z.string().max(255).optional(),
  repair_status: z.enum(["pending", "in_progress", "completed", "irreparable"]).optional(),
  repair_notes: z.string().max(2000).optional(),
});

// ─── Maintenance ─────────────────────────────────────────

export const createMaintenanceSchema = z.object({
  asset_id: z.string().uuid("Asset is required"),
  maintenance_type: z.enum(["routine", "repair", "inspection", "calibration", "emergency"]).default("routine"),
  description: z.string().min(1, "Description is required").max(2000),
  scheduled_date: z.string().optional(),
  performed_by: z.string().max(255).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  next_maintenance_date: z.string().optional(),
});

export const updateMaintenanceSchema = z.object({
  maintenance_type: z.enum(["routine", "repair", "inspection", "calibration", "emergency"]).optional(),
  description: z.string().max(2000).optional(),
  scheduled_date: z.string().optional(),
  completed_date: z.string().optional(),
  performed_by: z.string().max(255).optional(),
  cost: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  next_maintenance_date: z.string().optional(),
  health_score: z.number().int().min(0).max(100).optional(),
});

// ─── Radio Equipment ─────────────────────────────────────

export const assignRadioSchema = z.object({
  asset_id: z.string().uuid("Asset is required"),
  current_holder_id: z.string().uuid("Holder is required"),
  frequency: z.string().max(100).optional(),
  battery_status: z.string().max(50).optional(),
  assigned_officer_id: z.string().uuid().optional().or(z.literal("")),
  location: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const returnRadioSchema = z.object({
  asset_id: z.string().uuid(),
  tracking_id: z.string().uuid(),
  battery_status: z.string().max(50).optional(),
  condition: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateBatterySchema = z.object({
  assetId: z.string().uuid(),
  batteryStatus: z.enum(["full", "high", "medium", "low", "critical", "dead"]),
});

export const updateFrequencySchema = z.object({
  assetId: z.string().uuid(),
  frequency: z.string().min(1).max(100),
});

export const markRadioMaintenanceSchema = z.object({
  assetId: z.string().uuid(),
  description: z.string().min(1).max(2000),
  maintenance_type: z.enum(["routine", "repair", "inspection", "calibration", "emergency"]).optional(),
  scheduled_date: z.string().optional(),
});

export const reportRadioLostSchema = z.object({
  asset_id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  date_lost: z.string().min(1),
  location_lost: z.string().max(500).optional(),
  description: z.string().min(1).max(2000),
  tracking_id: z.string().uuid().optional(),
});

// ─── Settings ────────────────────────────────────────────

export const updateSettingSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.any(),
  updatedBy: z.string().uuid().optional(),
});

export const createSettingSchema = z.object({
  key: z.string().min(1).max(255),
  value: z.any(),
  description: z.string().max(500).optional(),
});

// ─── Users ───────────────────────────────────────────────

export const updateUserSchema = z.object({
  role: z.enum(["logistics_officer", "rotc_officer"]).optional(),
  is_active: z.boolean().optional(),
  is_approved: z.boolean().optional(),
  approved_by: z.string().uuid().optional(),
  first_name: z.string().min(1).max(255).optional(),
  last_name: z.string().min(1).max(255).optional(),
  contact_number: z.string().max(50).optional(),
});

export const approveUserSchema = z.object({
  id: z.string().uuid(),
  approvedById: z.string().uuid(),
});

export const createOfficerAccountSchema = z.object({
  student_number: z.string().min(1, "Student ID is required").max(50),
  first_name: z.string().min(1, "First name is required").max(255),
  last_name: z.string().min(1, "Last name is required").max(255),
  email: z.string().email("Valid email is required").max(255),
  contact_number: z.string().max(50).optional(),
  role: z.enum(["logistics_officer", "rotc_officer"]).default("rotc_officer"),
});

export const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

// ─── Auth ────────────────────────────────────────────────

export const lookupEmailSchema = z.object({
  student_number: z.string().min(1).max(50).optional(),
  user_id: z.string().uuid().optional(),
}).refine(
  data => data.student_number || data.user_id,
  { message: "Provide student_number or user_id" }
);

// ─── Activity Log ────────────────────────────────────────

export const logActivitySchema = z.object({
  user_id: z.string().uuid(),
  activity_type: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  reference_type: z.string().max(100).optional(),
  reference_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ─── Validation Helper ───────────────────────────────────

/**
 * Parses and validates input against a Zod schema.
 * Throws a clear error message on failure.
 */
export function validateOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issues = (parsed.error as any)?.issues ?? [];
    const message = issues.length > 0
      ? issues.map((i: any) => `${i.path?.join(".") ?? ""}: ${i.message}`).join("; ")
      : String(parsed.error);
    throw new Error(`Validation failed: ${message}`);
  }
  return parsed.data;
}
