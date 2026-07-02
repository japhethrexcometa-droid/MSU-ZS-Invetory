import { createClient } from "@/lib/supabase/client";
import type { Asset, BorrowTransaction, RadioTracking } from "@/types/database";
import {
  assignRadioSchema,
  returnRadioSchema,
  updateBatterySchema,
  updateFrequencySchema,
  markRadioMaintenanceSchema,
  reportRadioLostSchema,
  validateOrThrow,
} from "@/lib/validations";

// ─── Types ───────────────────────────────────────────────
export type RadioStatus = "available" | "assigned" | "borrowed" | "maintenance" | "lost";

export const BATTERY_LEVELS = ["full", "high", "medium", "low", "critical", "dead"] as const;
export type BatteryLevel = (typeof BATTERY_LEVELS)[number];

export const FREQUENCY_BANDS = ["VHF", "UHF", "HF", "Multi-band"] as const;

export const RADIO_STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "success" | "warning" | "destructive" | "accent" | "outline" }
> = {
  available: { label: "Available", variant: "success" },
  assigned: { label: "Assigned", variant: "accent" },
  borrowed: { label: "Borrowed", variant: "warning" },
  maintenance: { label: "Maintenance", variant: "outline" },
  lost: { label: "Lost", variant: "destructive" },
};

export const BATTERY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  full: { label: "Full", color: "text-success", icon: "battery-full" },
  high: { label: "High", color: "text-success", icon: "battery-high" },
  medium: { label: "Medium", color: "text-warning", icon: "battery-medium" },
  low: { label: "Low", color: "text-warning", icon: "battery-low" },
  critical: { label: "Critical", color: "text-destructive", icon: "battery-low" },
  dead: { label: "Dead", color: "text-destructive", icon: "battery-dead" },
};

// ─── Fetch Radios (assets where is_radio = true) ─────────
export async function fetchRadios(params: {
  search?: string;
  status?: string;
  batteryStatus?: string;
  frequencyBand?: string;
  assignedTo?: string;
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: "asc" | "desc";
}) {
  const supabase = createClient();
  const {
    search,
    status,
    batteryStatus,
    frequencyBand,
    assignedTo,
    page = 1,
    pageSize = 20,
    sortField = "created_at",
    sortOrder = "desc",
  } = params;

  let query = supabase
    .from("assets")
    .select(
      `
      *,
      category:category_id(id, name),
      location:location_id(id, building, room),
      assigned_officer:assigned_officer_id(id, first_name, last_name),
      tracking:radio_tracking(*)
    `,
      { count: "exact" }
    )
    .eq("is_deleted", false)
    .eq("is_radio", true);

  if (search) {
    query = query.or(
      `item_name.ilike.%${search}%,asset_id.ilike.%${search}%,serial_number.ilike.%${search}%,radio_frequency.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (batteryStatus) query = query.eq("battery_status", batteryStatus);
  if (frequencyBand) query = query.eq("radio_frequency", frequencyBand);

  if (assignedTo) {
    query = query.eq("assigned_officer_id", assignedTo);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order(sortField, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, error, count } = await query;

  if (error) throw error;
  return { data: data as unknown as Asset[], count: count || 0 };
}

// ─── Fetch Single Radio with Full Relations ──────────────
export async function fetchRadioById(id: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      category:category_id(*),
      location:location_id(*),
      assigned_officer:assigned_officer_id(id, first_name, last_name, email, role),
      tracking:radio_tracking(
        *,
        current_holder:current_holder_id(id, first_name, last_name, role),
        last_borrower:last_borrower_id(id, first_name, last_name)
      )
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) throw error;
  return data as unknown as Asset;
}

// ─── Fetch Borrowing History for a Radio ──────────────────
export async function fetchRadioBorrowHistory(
  assetId: string,
  limit = 50
): Promise<BorrowTransaction[]> {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("borrow_transactions")
    .select(
      `
      *,
      borrower:borrower_id(id, first_name, last_name, student_number, officer_id),
      approved_by_profile:approved_by(id, first_name, last_name),
      released_by_profile:released_by(id, first_name, last_name)
    `
    )
    .eq("asset_id", assetId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as unknown as BorrowTransaction[];
}

// ─── Fetch Radio Tracking History (from radio_tracking table) ──
export async function fetchRadioTrackingHistory(assetId: string) {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("radio_tracking")
    .select(
      `
      *,
      current_holder:current_holder_id(id, first_name, last_name, role),
      last_borrower:last_borrower_id(id, first_name, last_name)
    `
    )
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data as unknown as RadioTracking[];
}

// ─── Assign Radio to a Holder ─────────────────────────────
export async function assignRadio(raw: Record<string, unknown>) {
  const data = validateOrThrow(assignRadioSchema, raw);
  const supabase = createClient();

  // 1. Create a radio_tracking record
  const { data: tracking, error: trackingError } = await (supabase as any)
    .from("radio_tracking")
    .insert({
      asset_id: data.asset_id,
      current_holder_id: data.current_holder_id,
      frequency: data.frequency || null,
      battery_status: data.battery_status || null,
      assigned_officer_id: data.assigned_officer_id || null,
      location: data.location || null,
      notes: data.notes || null,
      issue_date: new Date().toISOString(),
    })
    .select()
    .single();

  if (trackingError) throw trackingError;

  // 2. Update the asset's radio fields and status
  await (supabase as any)
    .from("assets")
    .update({
      assigned_officer_id: data.assigned_officer_id || null,
      radio_frequency: data.frequency || null,
      battery_status: data.battery_status || null,
      status: "borrowed",
    })
    .eq("id", data.asset_id);

  return tracking as unknown as RadioTracking;
}

// ─── Process Radio Return ─────────────────────────────────
export async function returnRadio(raw: Record<string, unknown>) {
  const data = validateOrThrow(returnRadioSchema, raw);
  const supabase = createClient();

  // 1. Update the tracking record
  const { data: tracking, error: trackingError } = await (supabase as any)
    .from("radio_tracking")
    .update({
      return_date: new Date().toISOString(),
      battery_status: data.battery_status || null,
      notes: data.notes || null,
    })
    .eq("id", data.tracking_id)
    .select()
    .single();

  if (trackingError) throw trackingError;

  // 2. Update the asset's status and battery condition
  const updateData: Record<string, any> = {
    status: "available",
    battery_status: data.battery_status || null,
  };
  if (data.condition) {
    updateData.condition = data.condition;
  }

  await (supabase as any)
    .from("assets")
    .update(updateData)
    .eq("id", data.asset_id);

  return tracking as unknown as RadioTracking;
}

// ─── Update Radio Battery Status ──────────────────────────
export async function updateRadioBatteryStatus(assetId: string, batteryStatus: string) {
  validateOrThrow(updateBatterySchema, { assetId, batteryStatus });
  const supabase = createClient();

  const { error } = await (supabase as any)
    .from("assets")
    .update({ battery_status: batteryStatus })
    .eq("id", assetId);

  if (error) throw error;
}

// ─── Update Radio Frequency ───────────────────────────────
export async function updateRadioFrequency(assetId: string, frequency: string) {
  validateOrThrow(updateFrequencySchema, { assetId, frequency });
  const supabase = createClient();

  const { error } = await (supabase as any)
    .from("assets")
    .update({ radio_frequency: frequency })
    .eq("id", assetId);

  if (error) throw error;
}

// ─── Report Radio as Lost ─────────────────────────────────
export async function reportRadioLost(raw: Record<string, unknown>) {
  const data = validateOrThrow(reportRadioLostSchema, raw);
  const supabase = createClient();

  // 1. Update asset status to lost
  await (supabase as any)
    .from("assets")
    .update({ status: "lost", condition: "damaged" })
    .eq("id", data.asset_id);

  // 2. Update tracking record if exists
  if (data.tracking_id) {
    await (supabase as any)
      .from("radio_tracking")
      .update({ return_date: new Date().toISOString(), notes: "REPORTED LOST" })
      .eq("id", data.tracking_id);
  }

  // 3. Create lost report
  const { data: report, error } = await (supabase as any)
    .from("lost_reports")
    .insert({
      asset_id: data.asset_id,
      reporter_id: data.reporter_id,
      date_lost: data.date_lost,
      location_lost: data.location_lost || null,
      description: data.description,
    })
    .select()
    .single();

  if (error) throw error;
  return report;
}

// ─── Mark Radio for Maintenance ───────────────────────────
export async function markRadioMaintenance(assetId: string, raw: Record<string, unknown>) {
  const data = validateOrThrow(markRadioMaintenanceSchema, { ...raw, assetId });
  const supabase = createClient();

  // 1. Update asset status
  await (supabase as any)
    .from("assets")
    .update({ status: "maintenance" })
    .eq("id", assetId);

  // 2. Create maintenance record
  const { data: record, error } = await (supabase as any)
    .from("maintenance_records")
    .insert({
      asset_id: assetId,
      description: data.description,
      maintenance_type: data.maintenance_type || "repair",
      scheduled_date: data.scheduled_date || new Date().toISOString().split("T")[0],
      status: "scheduled",
    })
    .select()
    .single();

  if (error) throw error;
  return record;
}

// ─── Overdue Radio Detection ──────────────────────────────
export async function checkOverdueRadios(): Promise<Asset[]> {
  const supabase = createClient();

  // Find all radios that are currently borrowed but past their expected return
  const { data: overdueTxns } = await (supabase as any)
    .from("borrow_transactions")
    .select("asset_id")
    .eq("status", "released")
    .lt("expected_return_date", new Date().toISOString());

  if (!overdueTxns || overdueTxns.length === 0) return [];

  const assetIds = overdueTxns.map((t: any) => t.asset_id);

  const { data, error } = await supabase
    .from("assets")
    .select(
      `
      *,
      location:location_id(id, building, room),
      assigned_officer:assigned_officer_id(id, first_name, last_name)
    `
    )
    .in("id", assetIds)
    .eq("is_radio", true)
    .eq("is_deleted", false);

  if (error) throw error;
  return data as unknown as Asset[];
}

// ─── Radio Statistics ─────────────────────────────────────
export async function fetchRadioStats() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("assets")
    .select("id, status, battery_status, condition")
    .eq("is_deleted", false)
    .eq("is_radio", true);

  if (error) throw error;

  const radios: Array<{ status: string; battery_status: string | null; condition: string }> = data || [];
  return {
    total: radios.length,
    available: radios.filter((r) => r.status === "available").length,
    assigned: radios.filter((r) => r.status === "borrowed").length,
    maintenance: radios.filter((r) => r.status === "maintenance").length,
    lost: radios.filter((r) => r.status === "lost").length,
    lowBattery: radios.filter(
      (r) => r.battery_status === "low" || r.battery_status === "critical" || r.battery_status === "dead"
    ).length,
    needsService: radios.filter((r) => r.condition === "poor" || r.condition === "damaged").length,
  };
}

// ─── Format helpers ───────────────────────────────────────
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getBatteryIcon(batteryStatus: string | null): string {
  if (!batteryStatus) return "battery-medium";
  return BATTERY_CONFIG[batteryStatus]?.icon || "battery-medium";
}

export function getBatteryColor(batteryStatus: string | null): string {
  if (!batteryStatus) return "text-muted-foreground";
  return BATTERY_CONFIG[batteryStatus]?.color || "text-muted-foreground";
}
