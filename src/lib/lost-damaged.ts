import { createClient } from "@/lib/supabase/client";
import type { LostReport, DamageReport } from "@/types/database";

// ─── Lost Reports ─────────────────────────────────────────

export async function fetchLostReports(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, status, page = 1, pageSize = 20 } = params;

  let query = (supabase as any)
    .from("lost_reports")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name, image_url, category:category_id(name)),
      reporter:reporter_id(id, first_name, last_name, student_number),
      investigating_officer:investigating_officer_id(id, first_name, last_name)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `report_no.ilike.%${search}%,description.ilike.%${search}%,asset.item_name.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("replacement_status", status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as LostReport[], count: count || 0 };
}

export async function fetchLostReportById(id: string) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("lost_reports")
    .select(
      `
      *,
      asset:asset_id(*, category:category_id(*)),
      reporter:reporter_id(*),
      investigating_officer:investigating_officer_id(id, first_name, last_name, email, role),
      evidence:lost_report_evidence(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as LostReport;
}

export async function createLostReport(data: {
  asset_id: string;
  transaction_id?: string;
  reporter_id: string;
  date_lost: string;
  location_lost?: string;
  description: string;
}) {
  const supabase = createClient();
  const { data: report, error } = await (supabase as any)
    .from("lost_reports")
    .insert({
      asset_id: data.asset_id,
      transaction_id: data.transaction_id || null,
      reporter_id: data.reporter_id,
      date_lost: data.date_lost,
      location_lost: data.location_lost || null,
      description: data.description,
    })
    .select()
    .single();

  if (error) throw error;
  return report as unknown as LostReport;
}

export async function updateLostReport(
  id: string,
  data: Partial<{
    investigation_notes: string;
    investigating_officer_id: string;
    officer_remarks: string;
    replacement_status: string;
    is_approved: boolean;
    approved_by: string;
  }>
) {
  const supabase = createClient();
  const { data: report, error } = await (supabase as any)
    .from("lost_reports")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return report as unknown as LostReport;
}

// ─── Damage Reports ───────────────────────────────────────

export async function fetchDamageReports(params: {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, status, page = 1, pageSize = 20 } = params;

  let query = (supabase as any)
    .from("damage_reports")
    .select(
      `
      *,
      asset:asset_id(id, asset_id, item_name, image_url),
      reporter:reporter_id(id, first_name, last_name, student_number)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `report_no.ilike.%${search}%,damage_description.ilike.%${search}%,asset.item_name.ilike.%${search}%`
    );
  }
  if (status) query = query.eq("repair_status", status);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as DamageReport[], count: count || 0 };
}

export async function fetchDamageReportById(id: string) {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("damage_reports")
    .select(
      `
      *,
      asset:asset_id(*, category:category_id(*)),
      reporter:reporter_id(*),
      photos:damage_report_photos(*)
    `
    )
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as unknown as DamageReport;
}

export async function createDamageReport(data: {
  asset_id: string;
  transaction_id?: string;
  reporter_id: string;
  damage_description: string;
  estimated_repair_cost?: number;
}) {
  const supabase = createClient();
  const { data: report, error } = await (supabase as any)
    .from("damage_reports")
    .insert({
      asset_id: data.asset_id,
      transaction_id: data.transaction_id || null,
      reporter_id: data.reporter_id,
      damage_description: data.damage_description,
      estimated_repair_cost: data.estimated_repair_cost || null,
    })
    .select()
    .single();

  if (error) throw error;
  return report as unknown as DamageReport;
}

export async function updateDamageReport(
  id: string,
  data: Partial<{
    actual_repair_cost: number;
    assigned_technician: string;
    repair_status: string;
    repair_notes: string;
  }>
) {
  const supabase = createClient();
  const { data: report, error } = await (supabase as any)
    .from("damage_reports")
    .update(data)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return report as unknown as DamageReport;
}

// ─── Shared ───────────────────────────────────────────────

export const LOST_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline" }> = {
  pending: { label: "Pending", variant: "warning" },
  ordered: { label: "Replacement Ordered", variant: "secondary" },
  received: { label: "Replacement Received", variant: "default" },
  not_applicable: { label: "N/A", variant: "outline" },
};

export const DAMAGE_STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "warning" | "outline" }> = {
  pending: { label: "Pending", variant: "warning" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  irreparable: { label: "Irreparable", variant: "destructive" },
};
