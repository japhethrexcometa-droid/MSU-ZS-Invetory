import { createClient } from "@/lib/supabase/client";
import type { AuditLog } from "@/types/database";

export async function fetchAuditLogs(params: {
  search?: string;
  entityType?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = createClient();
  const { search, entityType, action, page = 1, pageSize = 50 } = params;

  let query = (supabase as any)
    .from("audit_logs")
    .select(
      `
      *,
      user:user_id(id, first_name, last_name, email, role)
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `entity_type.ilike.%${search}%,action.ilike.%${search}%,entity_id.ilike.%${search}%`
    );
  }
  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: data as unknown as AuditLog[], count: count || 0 };
}

export async function fetchAuditStats() {
  const supabase = createClient();

  const { data, error } = await (supabase as any)
    .from("audit_logs")
    .select("action, entity_type, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw error;

  const logs = data || [];

  return {
    total: logs.length,
    creates: logs.filter((l: any) => l.action === "CREATE").length,
    updates: logs.filter((l: any) => l.action === "UPDATE").length,
    deletes: logs.filter((l: any) => l.action === "DELETE").length,
    byEntity: logs.reduce((acc: Record<string, number>, l: any) => {
      acc[l.entity_type] = (acc[l.entity_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}

export function formatAuditAction(action: string): string {
  switch (action) {
    case "CREATE": return "Created";
    case "UPDATE": return "Updated";
    case "DELETE": return "Deleted";
    default: return action;
  }
}

export function formatEntityType(type: string): string {
  switch (type) {
    case "assets": return "Asset";
    case "borrow_transactions": return "Borrow Transaction";
    case "categories": return "Category";
    case "profiles": return "User Profile";
    case "locations": return "Location";
    case "maintenance_records": return "Maintenance Record";
    case "lost_reports": return "Lost Report";
    case "damage_reports": return "Damage Report";
    default: return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
