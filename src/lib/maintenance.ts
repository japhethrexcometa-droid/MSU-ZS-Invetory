import { createClient } from "@/lib/supabase/client";
import type { MaintenanceRecord } from "@/types/database";
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  validateOrThrow,
} from "@/lib/validations";

export async function fetchMaintenanceRecords(params: {
  search?: string;
  status?: string;
  type?: string;
  assetId?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, status, type, assetId, page = 1, pageSize = 20 } = params;

  let query = (supabase as any)
    .from("maintenance_records")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name, image_url, category:category_id(name)),
      performed_by_profile:performed_by(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `description.ilike.%${search}%,asset.item_name.ilike.%${search}%,asset.asset_id.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("maintenance_type", type);
  if (assetId) query = query.eq("asset_id", assetId);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as MaintenanceRecord[], count: count || 0 };
}

export async function fetchMaintenanceById(id: string) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("maintenance_records")
    .select(
      `
      *,
      asset:asset_id(*, category:category_id(*), location:location_id(*)),
      performed_by_profile:performed_by(id, first_name, last_name, email, role)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as MaintenanceRecord;
}

export async function createMaintenanceRecord(raw: Record<string, unknown>) {
  const data = validateOrThrow(createMaintenanceSchema, raw);
  const supabase = createClient();

  const { data: record, error } = await (supabase as any)
    .from("maintenance_records")
    .insert({
      asset_id: data.asset_id,
      maintenance_type: data.maintenance_type,
      description: data.description,
      scheduled_date: data.scheduled_date || null,
      performed_by: data.performed_by || null,
      cost: data.cost || null,
      notes: data.notes || null,
      next_maintenance_date: data.next_maintenance_date || null,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) throw error;

  // Update asset status to maintenance
  await (supabase as any)
    .from("assets")
    .update({ status: "maintenance" })
    .eq("id", data.asset_id);

  return record as unknown as MaintenanceRecord;
}

export async function updateMaintenanceRecord(id: string, raw: Record<string, unknown>) {
  const data = validateOrThrow(updateMaintenanceSchema, raw);
  const supabase = createClient();

  const { data: record, error } = await (supabase as any)
    .from("maintenance_records")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  // If completed, restore asset to available
  if (data.status === "completed") {
    await (supabase as any)
      .from("assets")
      .update({ status: "available" })
      .eq("id", record.asset_id);
  }

  return record as unknown as MaintenanceRecord;
}

export async function deleteMaintenanceRecord(id: string) {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("maintenance_records")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Maintenance Schedule ─────────────────────────────────

export async function fetchUpcomingMaintenance(limit = 10) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("maintenance_records")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name)
    `
    )
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as unknown as MaintenanceRecord[];
}

export const MAINTENANCE_TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline" }> = {
  routine: { label: "Routine", variant: "default" },
  repair: { label: "Repair", variant: "warning" },
  inspection: { label: "Inspection", variant: "secondary" },
  calibration: { label: "Calibration", variant: "outline" },
  emergency: { label: "Emergency", variant: "destructive" },
};

export const MAINTENANCE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  in_progress: { label: "In Progress", variant: "warning" },
  completed: { label: "Completed", variant: "default" },
  cancelled: { label: "Cancelled", variant: "secondary" },
};
